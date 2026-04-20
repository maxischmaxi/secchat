import { create } from 'zustand';

import * as storage from '@/storage/conversations';

interface ConversationsState {
  conversations: storage.LocalConversation[];
  messages: Record<string, storage.LocalMessage[]>;
  reload: () => Promise<void>;
  addConversation: (c: storage.LocalConversation) => Promise<void>;
  addMessage: (m: storage.LocalMessage) => Promise<void>;
}

export const useConversations = create<ConversationsState>((set, get) => ({
  conversations: [],
  messages: {},

  reload: async () => {
    const conversations = await storage.getConversations();
    const messages: Record<string, storage.LocalMessage[]> = {};
    for (const c of conversations) {
      messages[c.groupId] = await storage.getMessages(c.groupId);
    }
    set({ conversations, messages });
  },

  addConversation: async (c) => {
    await storage.addConversation(c);
    await get().reload();
  },

  addMessage: async (m) => {
    const added = await storage.addMessage(m);
    if (added) await get().reload();
  },
}));
