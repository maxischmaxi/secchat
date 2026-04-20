import { LONG_POLL_TIMEOUT_MS } from '@/config/api';
import { fromBase64, request } from './client';

export type InboxEventType = 'welcome' | 'commit' | 'application';

export interface InboxEvent {
  id: number;
  sender?: string;
  groupId?: string;
  type: InboxEventType;
  ciphertext: Uint8Array;
  createdAt: number;
}

export interface InboxBatch {
  events: InboxEvent[];
  cursor: number;
}

interface RawEvent {
  id: number;
  sender?: string;
  group_id?: string;
  type: InboxEventType;
  ciphertext: string;
  created_at: number;
}

interface RawBatch {
  events: RawEvent[];
  cursor: number;
}

/**
 * Ein einzelner Long-Poll-Roundtrip. Blockt bis zu ~30 s auf neue
 * Events oder timed out sauber. Aufrufer laufen das in einer
 * Endlosschleife solange sie authed sind.
 */
export async function pollInbox(
  token: string,
  since: number,
  signal?: AbortSignal,
): Promise<InboxBatch> {
  const raw = await request<RawBatch>({
    method: 'GET',
    path: `/inbox?since=${since}`,
    token,
    signal,
    timeoutMs: LONG_POLL_TIMEOUT_MS,
  });
  return {
    cursor: raw.cursor,
    events: raw.events.map((e) => ({
      id: e.id,
      sender: e.sender,
      groupId: e.group_id,
      type: e.type,
      ciphertext: fromBase64(e.ciphertext),
      createdAt: e.created_at,
    })),
  };
}
