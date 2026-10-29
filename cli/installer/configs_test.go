package installer

import (
	"os"
	"path"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfigs_Generate(t *testing.T) {
	outDir := t.TempDir()
	configs := NewConfigs(path.Join("..", "..", "config"), outDir)

	err := configs.Generate(Variables{
		AppDir:       "/snap/joplin/current",
		DataDir:      "/var/snap/joplin/current",
		CommonDir:    "/var/snap/joplin/common",
		AppUrl:       "https://joplin.example.com",
		AuthUrl:      "https://auth.example.com",
		AuthSocket:   "/var/snap/platform/current/authelia.socket",
		ClientSecret: "secret",
	})
	assert.NoError(t, err)

	env, err := os.ReadFile(path.Join(outDir, "joplin.env"))
	assert.NoError(t, err)
	assert.Contains(t, string(env), "\nAPP_BASE_URL=https://joplin.example.com\n")
	assert.Contains(t, string(env), "\nAPP_SOCKET=/var/snap/joplin/current/joplin.sock\n")
	assert.Contains(t, string(env), "\nSQLITE_DATABASE=/var/snap/joplin/current/joplin.sqlite\n")
	assert.Contains(t, string(env), "\nLOCAL_AUTH_ENABLED=false\n")
	assert.Contains(t, string(env), "\nOIDC_ISSUER_URL=https://auth.example.com\n")
	assert.Contains(t, string(env), "\nOIDC_ISSUER_SOCKET=/var/snap/platform/current/authelia.socket\n")
	assert.Contains(t, string(env), "\nOIDC_CLIENT_SECRET=secret\n")
	assert.NotContains(t, string(env), "{{")

	info, err := os.Stat(path.Join(outDir, "joplin.env"))
	assert.NoError(t, err)
	assert.Equal(t, os.FileMode(0600), info.Mode().Perm())

	nginx, err := os.ReadFile(path.Join(outDir, "nginx.conf"))
	assert.NoError(t, err)
	assert.Contains(t, string(nginx), "listen unix:/var/snap/joplin/common/web.socket;")
	assert.Contains(t, string(nginx), "server unix:/var/snap/joplin/current/joplin.sock;")
}
