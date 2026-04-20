package store

import (
	"context"
	"log"
	"time"
)

func StartHousekeeping(ctx context.Context, db *DB, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()

	runHousekeep(db)

	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			runHousekeep(db)
		}
	}
}

func runHousekeep(db *DB) {
	now := time.Now().Unix()

	consumedCutoff := now - 7*24*3600
	if _, err := db.Exec(
		`DELETE FROM inbox_events WHERE consumed_at IS NOT NULL AND consumed_at < ?`,
		consumedCutoff); err != nil {
		log.Printf("housekeeping: consumed events: %v", err)
	}

	staleCutoff := now - 30*24*3600
	if _, err := db.Exec(
		`DELETE FROM inbox_events WHERE consumed_at IS NULL AND created_at < ?`,
		staleCutoff); err != nil {
		log.Printf("housekeeping: stale events: %v", err)
	}

	if _, err := db.Exec(
		`DELETE FROM key_packages WHERE consumed_at IS NOT NULL AND consumed_at < ?`,
		staleCutoff); err != nil {
		log.Printf("housekeeping: consumed keypackages: %v", err)
	}

	if _, err := db.Exec(
		`DELETE FROM groups WHERE id NOT IN (
		    SELECT DISTINCT group_id FROM group_members WHERE left_at IS NULL
		)`); err != nil {
		log.Printf("housekeeping: empty groups: %v", err)
	}

	sessionCutoff := now - 90*24*3600
	if _, err := db.Exec(
		`DELETE FROM sessions WHERE last_seen < ?`,
		sessionCutoff); err != nil {
		log.Printf("housekeeping: stale sessions: %v", err)
	}
}
