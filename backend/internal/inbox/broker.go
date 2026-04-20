package inbox

import "sync"

// Broker notifies long-poll subscribers when new inbox events arrive.
// One subscriber per handle — second subscribe replaces the first (last
// connected device wins). Cleanup detaches only if the caller's own
// channel is still registered.
type Broker struct {
	mu   sync.Mutex
	subs map[string]chan struct{}
}

func NewBroker() *Broker {
	return &Broker{subs: make(map[string]chan struct{})}
}

func (b *Broker) Notify(handle string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if ch, ok := b.subs[handle]; ok {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

func (b *Broker) Subscribe(handle string) (<-chan struct{}, func()) {
	b.mu.Lock()
	defer b.mu.Unlock()
	ch := make(chan struct{}, 1)
	b.subs[handle] = ch
	cleanup := func() {
		b.mu.Lock()
		defer b.mu.Unlock()
		if cur, ok := b.subs[handle]; ok && cur == ch {
			delete(b.subs, handle)
		}
	}
	return ch, cleanup
}
