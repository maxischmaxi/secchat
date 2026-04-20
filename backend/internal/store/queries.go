package store

import (
	"context"
	"database/sql"
	"time"
)

type User struct {
	Handle         string
	IdentityPubkey []byte
	CreatedAt      time.Time
}

func (db *DB) CreateUser(ctx context.Context, handle string, pubkey []byte) error {
	_, err := db.ExecContext(ctx,
		`INSERT INTO users (handle, identity_pubkey, created_at) VALUES (?, ?, ?)`,
		handle, pubkey, time.Now().Unix(),
	)
	return err
}

func (db *DB) GetUser(ctx context.Context, handle string) (User, error) {
	var u User
	var created int64
	err := db.QueryRowContext(ctx,
		`SELECT handle, identity_pubkey, created_at FROM users WHERE handle = ?`,
		handle,
	).Scan(&u.Handle, &u.IdentityPubkey, &created)
	if err == nil {
		u.CreatedAt = time.Unix(created, 0)
	}
	return u, err
}

func (db *DB) CreateSession(ctx context.Context, token, handle string) error {
	now := time.Now().Unix()
	_, err := db.ExecContext(ctx,
		`INSERT INTO sessions (token, handle, created_at, last_seen) VALUES (?, ?, ?, ?)`,
		token, handle, now, now,
	)
	return err
}

func (db *DB) LookupSession(ctx context.Context, token string) (string, error) {
	var handle string
	err := db.QueryRowContext(ctx,
		`SELECT handle FROM sessions WHERE token = ?`, token,
	).Scan(&handle)
	if err != nil {
		return "", err
	}
	_, _ = db.ExecContext(ctx,
		`UPDATE sessions SET last_seen = ? WHERE token = ?`,
		time.Now().Unix(), token,
	)
	return handle, nil
}

func (db *DB) InsertKeyPackage(ctx context.Context, owner string, payload []byte) (int64, error) {
	res, err := db.ExecContext(ctx,
		`INSERT INTO key_packages (owner_handle, payload, uploaded_at) VALUES (?, ?, ?)`,
		owner, payload, time.Now().Unix(),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (db *DB) ClaimKeyPackage(ctx context.Context, owner string) ([]byte, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var id int64
	var payload []byte
	err = tx.QueryRowContext(ctx,
		`SELECT id, payload FROM key_packages
		  WHERE owner_handle = ? AND consumed_at IS NULL
		  ORDER BY id ASC LIMIT 1`,
		owner,
	).Scan(&id, &payload)
	if err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx,
		`UPDATE key_packages SET consumed_at = ? WHERE id = ?`,
		time.Now().Unix(), id,
	); err != nil {
		return nil, err
	}
	return payload, tx.Commit()
}

func (db *DB) CreateGroup(ctx context.Context, groupID, creator string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	now := time.Now().Unix()
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO groups (id, created_at) VALUES (?, ?)`,
		groupID, now,
	); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO group_members (group_id, member_handle, joined_at) VALUES (?, ?, ?)`,
		groupID, creator, now,
	); err != nil {
		return err
	}
	return tx.Commit()
}

func (db *DB) GroupActiveMembers(ctx context.Context, groupID string) ([]string, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT member_handle FROM group_members
		  WHERE group_id = ? AND left_at IS NULL`,
		groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var handles []string
	for rows.Next() {
		var h string
		if err := rows.Scan(&h); err != nil {
			return nil, err
		}
		handles = append(handles, h)
	}
	return handles, rows.Err()
}

func (db *DB) AddGroupMember(ctx context.Context, groupID, handle string) error {
	_, err := db.ExecContext(ctx,
		`INSERT INTO group_members (group_id, member_handle, joined_at)
		   VALUES (?, ?, ?)
		 ON CONFLICT(group_id, member_handle) DO UPDATE
		   SET left_at = NULL, joined_at = excluded.joined_at`,
		groupID, handle, time.Now().Unix(),
	)
	return err
}

func (db *DB) RemoveGroupMember(ctx context.Context, groupID, handle string) error {
	_, err := db.ExecContext(ctx,
		`UPDATE group_members SET left_at = ?
		  WHERE group_id = ? AND member_handle = ? AND left_at IS NULL`,
		time.Now().Unix(), groupID, handle,
	)
	return err
}

type Event struct {
	ID         int64
	Recipient  string
	Sender     sql.NullString
	GroupID    sql.NullString
	EventType  string
	Ciphertext []byte
	CreatedAt  time.Time
}

func (db *DB) InsertInboxEvent(ctx context.Context, e Event) (int64, error) {
	res, err := db.ExecContext(ctx,
		`INSERT INTO inbox_events
		   (recipient_handle, sender_handle, group_id, event_type, ciphertext, created_at)
		  VALUES (?, ?, ?, ?, ?, ?)`,
		e.Recipient, e.Sender, e.GroupID, e.EventType, e.Ciphertext,
		time.Now().Unix(),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (db *DB) FetchInboxEvents(ctx context.Context, recipient string, since int64, limit int) ([]Event, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT id, recipient_handle, sender_handle, group_id, event_type, ciphertext, created_at
		  FROM inbox_events
		  WHERE recipient_handle = ? AND id > ?
		  ORDER BY id ASC
		  LIMIT ?`,
		recipient, since, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var created int64
		if err := rows.Scan(
			&e.ID, &e.Recipient, &e.Sender, &e.GroupID,
			&e.EventType, &e.Ciphertext, &created,
		); err != nil {
			return nil, err
		}
		e.CreatedAt = time.Unix(created, 0)
		events = append(events, e)
	}
	return events, rows.Err()
}

func (db *DB) MarkEventsConsumed(ctx context.Context, recipient string, upTo int64) error {
	_, err := db.ExecContext(ctx,
		`UPDATE inbox_events SET consumed_at = ?
		  WHERE recipient_handle = ? AND id <= ? AND consumed_at IS NULL`,
		time.Now().Unix(), recipient, upTo,
	)
	return err
}
