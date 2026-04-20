package api

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base32"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/secchat/backend/internal/store"
)

const (
	handleLength      = 12
	challengeTTL      = 60 * time.Second
	longPollTTL       = 30 * time.Second
	sessionTokenBytes = 32
	nonceBytes        = 32
	maxKeyPackages    = 100
)

var b32 = base32.StdEncoding.WithPadding(base32.NoPadding)

// deriveHandle — handle = first 12 chars of lowercase base32(sha256(pubkey)).
// ~60 bits → negligible collision risk for sane user counts.
func deriveHandle(pubkey []byte) string {
	h := sha256.Sum256(pubkey)
	return strings.ToLower(b32.EncodeToString(h[:]))[:handleLength]
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- Register ------------------------------------------------------------

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Pubkey []byte `json:"pubkey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(req.Pubkey) != ed25519.PublicKeySize {
		httpError(w, http.StatusBadRequest, "invalid pubkey length")
		return
	}
	handle := deriveHandle(req.Pubkey)
	err := s.db.CreateUser(r.Context(), handle, req.Pubkey)
	if err != nil {
		existing, gerr := s.db.GetUser(r.Context(), handle)
		if gerr == nil && bytes.Equal(existing.IdentityPubkey, req.Pubkey) {
			writeJSON(w, http.StatusOK, map[string]string{"handle": handle})
			return
		}
		httpError(w, http.StatusConflict, "handle collision or duplicate pubkey")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"handle": handle})
}

// --- Challenge store (in-memory) -----------------------------------------

type pendingChallenge struct {
	handle    string
	nonce     []byte
	expiresAt time.Time
}

type challengeStore struct {
	mu sync.Mutex
	m  map[string]pendingChallenge
}

func newChallengeStore() *challengeStore {
	return &challengeStore{m: make(map[string]pendingChallenge)}
}

func (cs *challengeStore) issue(handle string) ([]byte, error) {
	nonce := make([]byte, nonceBytes)
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	cs.mu.Lock()
	cs.m[hex.EncodeToString(nonce)] = pendingChallenge{
		handle:    handle,
		nonce:     nonce,
		expiresAt: time.Now().Add(challengeTTL),
	}
	cs.mu.Unlock()
	return nonce, nil
}

func (cs *challengeStore) consume(handle string, nonce []byte) (pendingChallenge, bool) {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	key := hex.EncodeToString(nonce)
	c, ok := cs.m[key]
	if !ok {
		return pendingChallenge{}, false
	}
	delete(cs.m, key)
	if c.handle != handle || time.Now().After(c.expiresAt) {
		return pendingChallenge{}, false
	}
	return c, true
}

func (cs *challengeStore) gc(ctx context.Context, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			cs.mu.Lock()
			now := time.Now()
			for k, v := range cs.m {
				if now.After(v.expiresAt) {
					delete(cs.m, k)
				}
			}
			cs.mu.Unlock()
		}
	}
}

// --- Auth: challenge + verify --------------------------------------------

func (s *Server) handleChallenge(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json")
		return
	}
	// issue even for unknown handles — avoid leaking existence via timing
	nonce, err := s.challenges.issue(req.Handle)
	if err != nil {
		httpError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"nonce":      nonce,
		"expires_in": int(challengeTTL.Seconds()),
	})
}

func (s *Server) handleVerify(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Handle    string `json:"handle"`
		Nonce     []byte `json:"nonce"`
		Signature []byte `json:"signature"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json")
		return
	}
	c, ok := s.challenges.consume(req.Handle, req.Nonce)
	if !ok {
		httpError(w, http.StatusUnauthorized, "invalid or expired challenge")
		return
	}
	user, err := s.db.GetUser(r.Context(), req.Handle)
	if err != nil {
		httpError(w, http.StatusUnauthorized, "unknown handle")
		return
	}
	if !ed25519.Verify(user.IdentityPubkey, c.nonce, req.Signature) {
		httpError(w, http.StatusUnauthorized, "bad signature")
		return
	}
	tokenBytes := make([]byte, sessionTokenBytes)
	if _, err := rand.Read(tokenBytes); err != nil {
		httpError(w, http.StatusInternalServerError, "internal error")
		return
	}
	token := hex.EncodeToString(tokenBytes)
	if err := s.db.CreateSession(r.Context(), token, req.Handle); err != nil {
		httpError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"token":  token,
		"handle": req.Handle,
	})
}

// --- KeyPackages ---------------------------------------------------------

func (s *Server) handleUploadKeyPackages(w http.ResponseWriter, r *http.Request) {
	me := handleFromCtx(r.Context())
	var req struct {
		Packages [][]byte `json:"packages"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(req.Packages) == 0 || len(req.Packages) > maxKeyPackages {
		httpError(w, http.StatusBadRequest, "invalid packages count")
		return
	}
	ids := make([]int64, 0, len(req.Packages))
	for _, pkg := range req.Packages {
		id, err := s.db.InsertKeyPackage(r.Context(), me, pkg)
		if err != nil {
			httpError(w, http.StatusInternalServerError, "db error")
			return
		}
		ids = append(ids, id)
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ids": ids})
}

func (s *Server) handleClaimKeyPackage(w http.ResponseWriter, r *http.Request) {
	target := chi.URLParam(r, "handle")
	pkg, err := s.db.ClaimKeyPackage(r.Context(), target)
	if errors.Is(err, sql.ErrNoRows) {
		httpError(w, http.StatusNotFound, "no keypackage available")
		return
	}
	if err != nil {
		httpError(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"package": pkg})
}

// --- Groups --------------------------------------------------------------

func (s *Server) handleCreateGroup(w http.ResponseWriter, r *http.Request) {
	me := handleFromCtx(r.Context())
	var req struct {
		GroupID string `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(req.GroupID) < 8 || len(req.GroupID) > 64 {
		httpError(w, http.StatusBadRequest, "invalid group id")
		return
	}
	if err := s.db.CreateGroup(r.Context(), req.GroupID, me); err != nil {
		httpError(w, http.StatusConflict, "group id taken")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"group_id": req.GroupID})
}

func (s *Server) handleCommit(w http.ResponseWriter, r *http.Request) {
	sender := handleFromCtx(r.Context())
	groupID := chi.URLParam(r, "id")

	var req struct {
		Commit   []byte `json:"commit"`
		Welcomes []struct {
			Recipient string `json:"recipient"`
			Blob      []byte `json:"blob"`
		} `json:"welcomes,omitempty"`
		Removed []string `json:"removed,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json")
		return
	}

	members, err := s.db.GroupActiveMembers(r.Context(), groupID)
	if err != nil || !contains(members, sender) {
		httpError(w, http.StatusForbidden, "not a group member")
		return
	}

	ctx := r.Context()
	notifyList := make([]string, 0)

	for _, m := range members {
		if m == sender {
			continue
		}
		if _, err := s.db.InsertInboxEvent(ctx, store.Event{
			Recipient:  m,
			Sender:     sql.NullString{String: sender, Valid: true},
			GroupID:    sql.NullString{String: groupID, Valid: true},
			EventType:  "commit",
			Ciphertext: req.Commit,
		}); err != nil {
			httpError(w, http.StatusInternalServerError, "db error")
			return
		}
		notifyList = append(notifyList, m)
	}

	for _, welcome := range req.Welcomes {
		if _, err := s.db.InsertInboxEvent(ctx, store.Event{
			Recipient:  welcome.Recipient,
			Sender:     sql.NullString{String: sender, Valid: true},
			GroupID:    sql.NullString{String: groupID, Valid: true},
			EventType:  "welcome",
			Ciphertext: welcome.Blob,
		}); err != nil {
			httpError(w, http.StatusInternalServerError, "db error")
			return
		}
		if err := s.db.AddGroupMember(ctx, groupID, welcome.Recipient); err != nil {
			httpError(w, http.StatusInternalServerError, "db error")
			return
		}
		notifyList = append(notifyList, welcome.Recipient)
	}

	for _, rm := range req.Removed {
		if err := s.db.RemoveGroupMember(ctx, groupID, rm); err != nil {
			httpError(w, http.StatusInternalServerError, "db error")
			return
		}
	}

	for _, h := range notifyList {
		s.broker.Notify(h)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleSendMessage(w http.ResponseWriter, r *http.Request) {
	sender := handleFromCtx(r.Context())
	groupID := chi.URLParam(r, "id")

	var req struct {
		Ciphertext []byte `json:"ciphertext"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(req.Ciphertext) == 0 {
		httpError(w, http.StatusBadRequest, "empty ciphertext")
		return
	}

	members, err := s.db.GroupActiveMembers(r.Context(), groupID)
	if err != nil || !contains(members, sender) {
		httpError(w, http.StatusForbidden, "not a group member")
		return
	}

	ctx := r.Context()
	for _, m := range members {
		if m == sender {
			continue
		}
		if _, err := s.db.InsertInboxEvent(ctx, store.Event{
			Recipient:  m,
			Sender:     sql.NullString{String: sender, Valid: true},
			GroupID:    sql.NullString{String: groupID, Valid: true},
			EventType:  "application",
			Ciphertext: req.Ciphertext,
		}); err != nil {
			httpError(w, http.StatusInternalServerError, "db error")
			return
		}
		s.broker.Notify(m)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- Inbox long-poll -----------------------------------------------------

type inboxEventOut struct {
	ID         int64  `json:"id"`
	Sender     string `json:"sender,omitempty"`
	GroupID    string `json:"group_id,omitempty"`
	Type       string `json:"type"`
	Ciphertext []byte `json:"ciphertext"`
	CreatedAt  int64  `json:"created_at"`
}

func (s *Server) handleInboxLongPoll(w http.ResponseWriter, r *http.Request) {
	me := handleFromCtx(r.Context())
	sinceStr := r.URL.Query().Get("since")
	since, _ := strconv.ParseInt(sinceStr, 10, 64)

	// Subscribe first so events that arrive between fetch and select aren't missed.
	ch, unsub := s.broker.Subscribe(me)
	defer unsub()

	ctx, cancel := context.WithTimeout(r.Context(), longPollTTL)
	defer cancel()

	for {
		events, err := s.db.FetchInboxEvents(ctx, me, since, 200)
		if err != nil {
			httpError(w, http.StatusInternalServerError, "db error")
			return
		}
		if len(events) > 0 {
			out := make([]inboxEventOut, 0, len(events))
			maxID := since
			for _, e := range events {
				o := inboxEventOut{
					ID:         e.ID,
					Type:       e.EventType,
					Ciphertext: e.Ciphertext,
					CreatedAt:  e.CreatedAt.Unix(),
				}
				if e.Sender.Valid {
					o.Sender = e.Sender.String
				}
				if e.GroupID.Valid {
					o.GroupID = e.GroupID.String
				}
				out = append(out, o)
				if e.ID > maxID {
					maxID = e.ID
				}
			}
			_ = s.db.MarkEventsConsumed(r.Context(), me, maxID)
			writeJSON(w, http.StatusOK, map[string]any{
				"events": out,
				"cursor": maxID,
			})
			return
		}
		select {
		case <-ch:
			// new event, loop and fetch
		case <-ctx.Done():
			writeJSON(w, http.StatusOK, map[string]any{
				"events": []inboxEventOut{},
				"cursor": since,
			})
			return
		}
	}
}

// --- util ----------------------------------------------------------------

func contains(ss []string, s string) bool {
	for _, v := range ss {
		if v == s {
			return true
		}
	}
	return false
}
