package installer

import (
	"os"
	"path"

	"github.com/syncloud/golib/config"
)

const envFile = "joplin.env"

type Configs struct {
	templateDir string
	outDir      string
}

func NewConfigs(templateDir, outDir string) *Configs {
	return &Configs{
		templateDir: templateDir,
		outDir:      outDir,
	}
}

func (c *Configs) Generate(variables Variables) error {
	if err := config.Generate(c.templateDir, c.outDir, variables); err != nil {
		return err
	}
	return os.Chmod(path.Join(c.outDir, envFile), 0600)
}
