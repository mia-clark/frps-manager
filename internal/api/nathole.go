package api

import (
	"context"
	"net/http"
	"time"

	"github.com/fatedier/frp/pkg/nathole"
)

// NatholeHandler serves /api/v1/nathole/discover.
type NatholeHandler struct{}

// NewNatholeHandler builds a NatholeHandler.
func NewNatholeHandler() *NatholeHandler { return &NatholeHandler{} }

// Discover performs an outbound STUN exchange and returns the observed
// public addresses + NAT type.
func (h *NatholeHandler) Discover(w http.ResponseWriter, r *http.Request) {
	var body struct {
		StunServer string `json:"stun_server"`
	}
	if r.ContentLength > 0 {
		if !decodeJSON(w, r, &body) {
			return
		}
	}
	if body.StunServer == "" {
		body.StunServer = "stun.easyvoip.com:3478"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 6*time.Second)
	defer cancel()
	_ = ctx // nathole API below is synchronous; ctx serves as caller intent only

	addrs, localAddr, err := nathole.Discover([]string{body.StunServer}, "")
	if err != nil {
		WriteError(w, http.StatusBadGateway, CodeUpstreamFailure, err.Error(), nil)
		return
	}
	local := ""
	if localAddr != nil {
		local = localAddr.String()
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"stun_server":  body.StunServer,
		"public_addrs": addrs,
		"local_addr":   local,
	})
}
