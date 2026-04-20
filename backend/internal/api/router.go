package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/secchat/backend/internal/inbox"
	"github.com/secchat/backend/internal/store"
)

type Server struct {
	db         *store.DB
	broker     *inbox.Broker
	challenges *challengeStore
}

func NewRouter(ctx context.Context, db *store.DB, broker *inbox.Broker) http.Handler {
	s := &Server{
		db:         db,
		broker:     broker,
		challenges: newChallengeStore(),
	}
	go s.challenges.gc(ctx, 60*time.Second)

	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)

	r.Get("/health", s.handleHealth)
	r.Post("/users", s.handleRegister)
	r.Post("/auth/challenge", s.handleChallenge)
	r.Post("/auth/verify", s.handleVerify)

	r.Group(func(auth chi.Router) {
		auth.Use(s.requireSession)
		auth.Post("/keypackages", s.handleUploadKeyPackages)
		auth.Get("/users/{handle}/keypackage", s.handleClaimKeyPackage)
		auth.Post("/groups", s.handleCreateGroup)
		auth.Post("/groups/{id}/commit", s.handleCommit)
		auth.Post("/groups/{id}/messages", s.handleSendMessage)
		auth.Get("/inbox", s.handleInboxLongPoll)
	})

	return r
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func httpError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
