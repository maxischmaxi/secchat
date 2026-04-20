import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'secchat.conversations.v1';

export interface LocalConversation {
  groupId: string;
  members: string[]; // handles (ohne eigenen)
  chatKeyB64: string;
  createdAt: number;
  lastMessageAt?: number;
}

export interface LocalMessage {
  id: string;
  serverId?: number; // Dedupe-Key fuer Server-gelieferte Events
  groupId: string;
  sender: string;
  text: string;
  sentAt: number;
  mine: boolean;
}

interface Store {
  conversations: LocalConversation[];
  messages: Record<string, LocalMessage[]>;
  inboxCursor: number;
}

const empty = (): Store => ({
  conversations: [],
  messages: {},
  inboxCursor: 0,
});

let cache: Store | null = null;

async function load(): Promise<Store> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) {
    try {
      cache = JSON.parse(raw) as Store;
      return cache;
    } catch {
      // corrupted — fall through
    }
  }
  cache = empty();
  return cache;
}

async function flush(): Promise<void> {
  if (!cache) return;
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}

export async function getConversations(): Promise<LocalConversation[]> {
  const s = await load();
  return [...s.conversations].sort(
    (a, b) => (b.lastMessageAt ?? b.createdAt) - (a.lastMessageAt ?? a.createdAt),
  );
}

export async function getConversation(
  groupId: string,
): Promise<LocalConversation | undefined> {
  const s = await load();
  return s.conversations.find((c) => c.groupId === groupId);
}

export async function addConversation(c: LocalConversation): Promise<void> {
  const s = await load();
  if (s.conversations.some((x) => x.groupId === c.groupId)) return;
  s.conversations.push(c);
  await flush();
}

export async function getMessages(groupId: string): Promise<LocalMessage[]> {
  const s = await load();
  return s.messages[groupId] ?? [];
}

export async function addMessage(m: LocalMessage): Promise<boolean> {
  const s = await load();
  const arr = (s.messages[m.groupId] ??= []);
  if (m.serverId !== undefined && arr.some((x) => x.serverId === m.serverId)) {
    return false;
  }
  arr.push(m);
  arr.sort((a, b) => a.sentAt - b.sentAt);
  const conv = s.conversations.find((c) => c.groupId === m.groupId);
  if (conv) conv.lastMessageAt = m.sentAt;
  await flush();
  return true;
}

export async function getInboxCursor(): Promise<number> {
  const s = await load();
  return s.inboxCursor;
}

export async function setInboxCursor(cursor: number): Promise<void> {
  const s = await load();
  s.inboxCursor = cursor;
  await flush();
}

export async function wipeConversations(): Promise<void> {
  cache = empty();
  await AsyncStorage.removeItem(KEY);
}
