package appcfg

import (
	"errors"
	"os"
	"strings"
	"time"
)

// Config is the daemon's own runtime configuration, populated from env vars.
type Config struct {
	HTTPAddr     string
	APIToken     string
	CORSOrigins  []string
	DataDir      string
	ProfilesDir  string
	LogsDir      string
	StoresDir    string
	MetaFile     string
	LogLevel     string
	DocsEnabled  bool
	ShutdownWait time.Duration
}

// Load reads configuration from environment variables. Required fields
// without sensible defaults will return an error.
func Load() (*Config, error) {
	cfg := &Config{
		HTTPAddr:     getEnv("FRPMGR_HTTP_ADDR", ":8080"),
		APIToken:     os.Getenv("FRPMGR_API_TOKEN"),
		CORSOrigins:  splitCSV(getEnv("FRPMGR_CORS_ORIGINS", "*")),
		DataDir:      getEnv("FRPMGR_DATA_DIR", "/data"),
		LogLevel:     strings.ToLower(getEnv("FRPMGR_LOG_LEVEL", "info")),
		DocsEnabled:  parseBool(getEnv("FRPMGR_DOCS_ENABLED", "true"), true),
		ShutdownWait: 10 * time.Second,
	}
	cfg.ProfilesDir = cfg.DataDir + "/profiles"
	cfg.LogsDir = cfg.DataDir + "/logs"
	cfg.StoresDir = cfg.DataDir + "/stores"
	cfg.MetaFile = cfg.DataDir + "/meta.json"

	if cfg.APIToken == "" {
		return nil, errors.New("FRPMGR_API_TOKEN is required")
	}
	return cfg, nil
}

// EnsureDirs creates the data subdirectories if they do not exist.
func (c *Config) EnsureDirs() error {
	for _, d := range []string{c.DataDir, c.ProfilesDir, c.LogsDir, c.StoresDir} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			return err
		}
	}
	return nil
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func parseBool(s string, def bool) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "1", "true", "yes", "on", "y":
		return true
	case "0", "false", "no", "off", "n":
		return false
	default:
		return def
	}
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
