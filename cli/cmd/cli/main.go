package main

import (
	"os"

	"github.com/spf13/cobra"
	"github.com/syncloud/golib/log"
	"hooks/installer"
)

func main() {
	logger := log.Logger()
	cmd := &cobra.Command{Use: "cli", SilenceUsage: true}

	cmd.AddCommand(&cobra.Command{
		Use: "access-change",
		RunE: func(cmd *cobra.Command, args []string) error {
			logger.Info("access-change")
			return installer.New(logger).AccessChange()
		},
	})
	cmd.AddCommand(&cobra.Command{
		Use: "restore-pre-start",
		RunE: func(cmd *cobra.Command, args []string) error {
			logger.Info("restore-pre-start")
			return installer.New(logger).RestorePreStart()
		},
	})

	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
