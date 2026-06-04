package api

import (
	"log/slog"
	"net/http"

	"github.com/mia-clark/frp-manager-server/internal/manager"
	"github.com/mia-clark/frp-manager-server/pkg/config"
)

func proxyName(p config.TypedProxyConfig) string {
	if p.ProxyConfigurer == nil {
		return ""
	}
	return p.GetBaseConfig().Name
}

func visitorName(v config.TypedVisitorConfig) string {
	if v.VisitorConfigurer == nil {
		return ""
	}
	return v.GetBaseConfig().Name
}

// ProxiesHandler serves /api/v1/configs/{id}/proxies/*.
type ProxiesHandler struct {
	m   *manager.Manager
	log *slog.Logger
}

// NewProxiesHandler creates a ProxiesHandler.
func NewProxiesHandler(m *manager.Manager, log *slog.Logger) *ProxiesHandler {
	return &ProxiesHandler{m: m, log: log}
}

// List returns each proxy plus its current runtime status.
func (h *ProxiesHandler) List(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	snap, _, err := h.m.Get(id, true)
	if writeManagerError(w, err) {
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": snap.Proxies})
}

// Get fetches a single proxy definition by name.
func (h *ProxiesHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, name := pathID(r), pathName(r)
	_, data, err := h.m.Get(id, false)
	if writeManagerError(w, err) {
		return
	}
	v := toV1(data)
	// search in both proxies and visitors
	for _, p := range v.Proxies {
		if proxyName(p) == name {
			WriteJSON(w, http.StatusOK, p)
			return
		}
	}
	for _, vv := range v.Visitors {
		if visitorName(vv) == name {
			WriteJSON(w, http.StatusOK, vv)
			return
		}
	}
	WriteError(w, http.StatusNotFound, CodeProxyNotFound, "proxy not found", nil)
}

// proxyReq holds the wire payload for create/update.
type proxyReq struct {
	Proxy   *config.TypedProxyConfig   `json:"proxy,omitempty"`
	Visitor *config.TypedVisitorConfig `json:"visitor,omitempty"`
}

// Create adds a new proxy (or visitor) to the config.
func (h *ProxiesHandler) Create(w http.ResponseWriter, r *http.Request) {
	id := pathID(r)
	var req proxyReq
	if !decodeJSON(w, r, &req) {
		return
	}
	if (req.Proxy == nil) == (req.Visitor == nil) {
		WriteError(w, http.StatusBadRequest, CodeBadRequest, "exactly one of proxy/visitor required", nil)
		return
	}
	_, data, err := h.m.Get(id, false)
	if writeManagerError(w, err) {
		return
	}
	v := toV1(data)
	if req.Proxy != nil {
		for _, p := range v.Proxies {
			if proxyName(p) == proxyName(*req.Proxy) {
				WriteError(w, http.StatusConflict, CodeProxyExists, "proxy already exists", nil)
				return
			}
		}
		v.Proxies = append(v.Proxies, *req.Proxy)
	} else {
		for _, vv := range v.Visitors {
			if visitorName(vv) == visitorName(*req.Visitor) {
				WriteError(w, http.StatusConflict, CodeProxyExists, "visitor already exists", nil)
				return
			}
		}
		v.Visitors = append(v.Visitors, *req.Visitor)
	}
	if err := h.m.Update(id, fromV1(v)); writeManagerError(w, err) {
		return
	}
	w.WriteHeader(http.StatusCreated)
}

// Update replaces a proxy/visitor in place.
func (h *ProxiesHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, name := pathID(r), pathName(r)
	var req proxyReq
	if !decodeJSON(w, r, &req) {
		return
	}
	_, data, err := h.m.Get(id, false)
	if writeManagerError(w, err) {
		return
	}
	v := toV1(data)
	replaced := false
	if req.Proxy != nil {
		for i, p := range v.Proxies {
			if proxyName(p) == name {
				v.Proxies[i] = *req.Proxy
				replaced = true
				break
			}
		}
	}
	if !replaced && req.Visitor != nil {
		for i, vv := range v.Visitors {
			if visitorName(vv) == name {
				v.Visitors[i] = *req.Visitor
				replaced = true
				break
			}
		}
	}
	if !replaced {
		WriteError(w, http.StatusNotFound, CodeProxyNotFound, "proxy not found", nil)
		return
	}
	if err := h.m.Update(id, fromV1(v)); writeManagerError(w, err) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Delete removes a proxy or visitor by name.
func (h *ProxiesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, name := pathID(r), pathName(r)
	_, data, err := h.m.Get(id, false)
	if writeManagerError(w, err) {
		return
	}
	v := toV1(data)
	removed := false
	out := v.Proxies[:0]
	for _, p := range v.Proxies {
		if proxyName(p) == name {
			removed = true
			continue
		}
		out = append(out, p)
	}
	v.Proxies = out
	outV := v.Visitors[:0]
	for _, vv := range v.Visitors {
		if visitorName(vv) == name {
			removed = true
			continue
		}
		outV = append(outV, vv)
	}
	v.Visitors = outV
	if !removed {
		WriteError(w, http.StatusNotFound, CodeProxyNotFound, "proxy not found", nil)
		return
	}
	if err := h.m.Update(id, fromV1(v)); writeManagerError(w, err) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Toggle flips the Disabled flag on a proxy. The body may omit "enabled"
// to invert the current state.
func (h *ProxiesHandler) Toggle(w http.ResponseWriter, r *http.Request) {
	id, name := pathID(r), pathName(r)
	var body struct {
		Enabled *bool `json:"enabled"`
	}
	if r.ContentLength > 0 {
		if !decodeJSON(w, r, &body) {
			return
		}
	}
	_, data, err := h.m.Get(id, false)
	if writeManagerError(w, err) {
		return
	}
	for _, p := range data.Proxies {
		if p.Name != name {
			continue
		}
		switch {
		case body.Enabled != nil:
			p.Disabled = !*body.Enabled
		default:
			p.Disabled = !p.Disabled
		}
		if err := h.m.Update(id, data); writeManagerError(w, err) {
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	WriteError(w, http.StatusNotFound, CodeProxyNotFound, "proxy not found", nil)
}
