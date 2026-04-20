package store

import (
	"context"
	"database/sql"

	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
}

func Open(path string) (*DB, error) {
	conn, err := sql.Open("sqlite",
		path+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}
	if err := conn.Ping(); err != nil {
		conn.Close()
		return nil, err
	}
	if _, err := conn.ExecContext(context.Background(), schema); err != nil {
		conn.Close()
		return nil, err
	}
	return &DB{conn}, nil
}

const schema = `
CREATE TABLE IF NOT EXISTS users (
  handle          TEXT PRIMARY KEY,
  identity_pubkey BLOB NOT NULL UNIQUE,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  handle      TEXT NOT NULL REFERENCES users(handle) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_handle ON sessions(handle);

CREATE TABLE IF NOT EXISTS key_packages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_handle TEXT NOT NULL REFERENCES users(handle) ON DELETE CASCADE,
  payload      BLOB NOT NULL,
  uploaded_at  INTEGER NOT NULL,
  consumed_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_keypackages_owner_avail
  ON key_packages(owner_handle, consumed_at);

CREATE TABLE IF NOT EXISTS groups (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id      TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_handle TEXT NOT NULL REFERENCES users(handle) ON DELETE CASCADE,
  joined_at     INTEGER NOT NULL,
  left_at       INTEGER,
  PRIMARY KEY (group_id, member_handle)
);

CREATE TABLE IF NOT EXISTS inbox_events (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_handle TEXT NOT NULL REFERENCES users(handle) ON DELETE CASCADE,
  sender_handle    TEXT,
  group_id         TEXT,
  event_type       TEXT NOT NULL,
  ciphertext       BLOB NOT NULL,
  created_at       INTEGER NOT NULL,
  consumed_at      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_inbox_recipient_cursor
  ON inbox_events(recipient_handle, id);
`
