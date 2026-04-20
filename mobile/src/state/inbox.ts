import { pollInbox, type InboxEvent } from '@/api/inbox';
import { decryptMessage, unwrapChatKey } from '@/crypto/chat';
import * as storage from '@/storage/conversations';

import { useConversations } from './conversations';

/**
 * Verarbeitet ein einzelnes Inbox-Event:
 *
 * * `welcome` → Chat-Key entpacken, neue Conversation lokal anlegen
 * * `application` → Nachricht mit zugehoerigem Chat-Key entschluesseln
 *   und in die lokale Message-Liste schreiben
 * * `commit` → im MVP ohne Wirkung (real-MLS-Hook fuer Phase 3d)
 */
async function processEvent(
  myX25519Priv: Uint8Array,
  toBase64: (b: Uint8Array) => string,
  event: InboxEvent,
): Promise<void> {
  switch (event.type) {
    case 'welcome': {
      if (!event.groupId || !event.sender) return;
      const existing = await storage.getConversation(event.groupId);
      if (existing) return;
      try {
        const { chatKey } = unwrapChatKey(myX25519Priv, event.ciphertext);
        await storage.addConversation({
          groupId: event.groupId,
          members: [event.sender],
          chatKeyB64: toBase64(chatKey),
          createdAt: event.createdAt * 1000,
        });
      } catch (e) {
        console.warn('[inbox] welcome konnte nicht entpackt werden:', e);
      }
      return;
    }

    case 'application': {
      if (!event.groupId || !event.sender) return;
      const conv = await storage.getConversation(event.groupId);
      if (!conv) {
        console.warn('[inbox] application fuer unbekannte Gruppe:', event.groupId);
        return;
      }
      try {
        const chatKey = fromBase64Internal(conv.chatKeyB64);
        const plain = decryptMessage(chatKey, event.ciphertext);
        const text = new TextDecoder().decode(plain);
        await storage.addMessage({
          id: `srv-${event.id}`,
          serverId: event.id,
          groupId: event.groupId,
          sender: event.sender,
          text,
          sentAt: event.createdAt * 1000,
          mine: false,
        });
      } catch (e) {
        console.warn('[inbox] Entschluesselung fehlgeschlagen:', e);
      }
      return;
    }

    case 'commit':
      return;
  }
}

// kleine interne base64 → bytes (vermeidet zyklischen Import auf api/client)
function fromBase64Internal(s: string): Uint8Array {
  const bin = globalThis.atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64Internal(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return globalThis.btoa(bin);
}

let running: AbortController | null = null;

/**
 * Startet den Long-Poll-Loop. Idempotent — ein zweiter Aufruf stoppt
 * den vorherigen und ersetzt ihn.
 */
export function startInboxLoop(
  token: string,
  myX25519Priv: Uint8Array,
): void {
  stopInboxLoop();
  const ac = new AbortController();
  running = ac;

  (async () => {
    while (!ac.signal.aborted) {
      const cursor = await storage.getInboxCursor();
      try {
        const batch = await pollInbox(token, cursor, ac.signal);
        for (const event of batch.events) {
          await processEvent(myX25519Priv, toBase64Internal, event);
        }
        if (batch.events.length > 0) {
          await storage.setInboxCursor(batch.cursor);
          await useConversations.getState().reload();
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        console.warn('[inbox] poll failed:', e);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();
}

export function stopInboxLoop(): void {
  if (running) {
    running.abort();
    running = null;
  }
}
