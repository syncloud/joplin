package installer

import (
	"fmt"
	"os"
	"path"

	"github.com/syncloud/golib/linux"
	"github.com/syncloud/golib/platform"
	"go.uber.org/zap"
)

const (
	App          = "joplin"
	AppDir       = "/snap/joplin/current"
	DataDir      = "/var/snap/joplin/current"
	CommonDir    = "/var/snap/joplin/common"
	OIDCRedirect = "/api/oidc"
)

type Installer struct {
	platformClient *platform.Client
	configs        *Configs
	logger         *zap.Logger
}

func New(logger *zap.Logger) *Installer {
	return &Installer{
		platformClient: platform.New(),
		configs:        NewConfigs(path.Join(AppDir, "config"), path.Join(DataDir, "config")),
		logger:         logger,
	}
}

func (i *Installer) Install() error {
	return linux.CreateUser(App)
}

func (i *Installer) Configure() error {
	if err := i.UpdateConfigs(); err != nil {
		return err
	}
	version, err := os.ReadFile(path.Join(AppDir, "version"))
	if err != nil {
		return err
	}
	return os.WriteFile(path.Join(DataDir, "version"), version, 0644)
}

func (i *Installer) PostRefresh() error {
	return os.RemoveAll(path.Join(DataDir, "version"))
}

func (i *Installer) AccessChange() error {
	if err := i.UpdateConfigs(); err != nil {
		return err
	}
	return i.platformClient.RestartService(fmt.Sprintf("%s.%s", App, App))
}

func (i *Installer) RestorePreStart() error {
	return i.Configure()
}

func (i *Installer) UpdateConfigs() error {
	if err := linux.CreateUser(App); err != nil {
		return err
	}
	if err := linux.CreateMissingDirs(
		path.Join(DataDir, "nginx"),
		path.Join(DataDir, "temp"),
		path.Join(DataDir, "resource"),
	); err != nil {
		return err
	}

	secret, err := i.platformClient.RegisterOIDCClient(App, []string{OIDCRedirect}, true, "client_secret_basic")
	if err != nil {
		return fmt.Errorf("oidc register: %w", err)
	}
	authUrl, err := i.platformClient.GetAppUrl("auth")
	if err != nil {
		return err
	}
	appUrl, err := i.platformClient.GetAppUrl(App)
	if err != nil {
		return err
	}

	err = i.configs.Generate(Variables{
		AppDir:       AppDir,
		DataDir:      DataDir,
		CommonDir:    CommonDir,
		AppUrl:       appUrl,
		AuthUrl:      authUrl,
		AuthSocket:   i.platformClient.GetAuthLocalSocket(),
		ClientSecret: secret,
	})
	if err != nil {
		return fmt.Errorf("generate config: %w", err)
	}

	if err := linux.Chown(DataDir, App); err != nil {
		return err
	}
	return linux.Chown(CommonDir, App)
}
