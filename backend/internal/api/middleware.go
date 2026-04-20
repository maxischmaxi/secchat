package api

import (
	"context"
	"net/http"
	"strings"
)

type ctxKey string

const ctxHandle ctxKey = "handle"

func (s *Server) requireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		const prefix = "Bearer "
		if !strings.HasPrefix(auth, prefix) {
			httpError(w, http.StatusUnauthorized, "missing bearer token")
			return
		}
		token := auth[len(prefix):]
		if len(token) < 32 {
			httpError(w, http.StatusUnauthorized, "invalid token")
			return
		}
		handle, err := s.db.LookupSession(r.Context(), token)
		if err != nil {
			httpError(w, http.StatusUnauthorized, "invalid session")
			return
		}
		ctx := context.WithValue(r.Context(), ctxHandle, handle)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func handleFromCtx(ctx context.Context) string {
	if h, ok := ctx.Value(ctxHandle).(string); ok {
		return h
	}
	return ""
}
