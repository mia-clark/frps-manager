package services

import (
	frpconfig "github.com/fatedier/frp/pkg/config"
	"github.com/fatedier/frp/pkg/config/v1/validation"
)

// VerifyClientConfig validates the frp client config file
func VerifyClientConfig(path string) error {
	cfg, proxyCfgs, visitorCfgs, _, err := frpconfig.LoadClientConfig(path, false)
	if err != nil {
		return err
	}
	_, err = validation.ValidateAllClientConfig(cfg, proxyCfgs, visitorCfgs, nil)
	return err
}
