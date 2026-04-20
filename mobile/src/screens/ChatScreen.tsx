import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fromBase64 } from '@/api/client';
import { sendMessage } from '@/api/messages';
import { encryptMessage } from '@/crypto/chat';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/state/auth';
import { useConversations } from '@/state/conversations';
import type { LocalMessage } from '@/storage/conversations';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatScreen({ route }: Props) {
  const { groupId } = route.params;
  const token = useAuth((s) => s.token);
  const myHandle = useAuth((s) => s.handle);
  const conversation = useConversations((s) =>
    s.conversations.find((c) => c.groupId === groupId),
  );
  const messages = useConversations((s) => s.messages[groupId] ?? []);
  const addMessage = useConversations((s) => s.addMessage);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<LocalMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending || !conversation || !token || !myHandle) return;
    setSending(true);
    try {
      const chatKey = fromBase64(conversation.chatKeyB64);
      const plain = new TextEncoder().encode(text);
      const ciphertext = await encryptMessage(chatKey, plain);

      await sendMessage(token, groupId, ciphertext);

      const now = Date.now();
      await addMessage({
        id: `local-${now}-${Math.random().toString(36).slice(2, 8)}`,
        groupId,
        sender: myHandle,
        text,
        sentAt: now,
        mine: true,
      });
      setDraft('');
    } catch (e) {
      Alert.alert('Senden fehlgeschlagen', String(e));
    } finally {
      setSending(false);
    }
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.body}>
          <Text style={styles.placeholder}>Chat nicht gefunden.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubbleRow,
                item.mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.mine ? styles.bubbleMine : styles.bubbleTheirs,
                ]}
              >
                <Text style={styles.bubbleText}>{item.text}</Text>
                <Text style={styles.bubbleTime}>{fmtTime(item.sentAt)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Keine Nachrichten. Schreib die erste.
              </Text>
            </View>
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Nachricht…"
            placeholderTextColor="#555"
            multiline
            autoCapitalize="sentences"
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!draft.trim() || sending) && styles.disabled,
            ]}
            disabled={!draft.trim() || sending}
            onPress={send}
          >
            <Text style={styles.sendBtnText}>{sending ? '…' : 'Senden'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  body: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: '#666', fontSize: 15 },
  listContent: { padding: 12, flexGrow: 1, justifyContent: 'flex-end' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#555', fontSize: 14 },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleMine: { backgroundColor: '#2b5bd1' },
  bubbleTheirs: { backgroundColor: '#1f1f1f' },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  bubbleTime: {
    color: '#bbbbbb99',
    fontSize: 10,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  composer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    borderTopColor: '#1a1a1a',
    borderTopWidth: 1,
    backgroundColor: '#0d0d0d',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: '#3d8bfd',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
