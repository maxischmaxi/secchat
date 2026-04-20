import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/state/auth';
import { useConversations } from '@/state/conversations';
import { wipeConversations } from '@/storage/conversations';
import { wipeAll } from '@/storage/keystore';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString();
}

export function HomeScreen({ navigation }: Props) {
  const handle = useAuth((s) => s.handle);
  const clear = useAuth((s) => s.clear);
  const conversations = useConversations((s) => s.conversations);
  const messages = useConversations((s) => s.messages);
  const reload = useConversations((s) => s.reload);

  useEffect(() => {
    reload();
  }, [reload]);

  function confirmWipe() {
    Alert.alert(
      'Wirklich alles löschen?',
      'Ohne deinen gesicherten Recovery-Seed sind alle Chats unwiederbringlich weg.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            await wipeAll();
            await wipeConversations();
            clear();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.handleLabel}>Dein Handle</Text>
        <Text style={styles.handle}>{handle}</Text>
      </View>

      <FlatList
        style={styles.list}
        data={conversations}
        keyExtractor={(c) => c.groupId}
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Noch keine Chats</Text>
            <Text style={styles.emptyText}>
              Tippe auf "+" und gib den Handle eines anderen secchat-Nutzers
              ein, um einen End-to-End-verschlüsselten Chat zu starten.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const msgs = messages[item.groupId] ?? [];
          const last = msgs[msgs.length - 1];
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate('Chat', { groupId: item.groupId })
              }
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowHandle}>{item.members.join(', ')}</Text>
                <Text style={styles.rowPreview} numberOfLines={1}>
                  {last
                    ? `${last.mine ? 'Du: ' : ''}${last.text}`
                    : 'Noch keine Nachrichten'}
                </Text>
              </View>
              <Text style={styles.rowTime}>
                {fmtTime(item.lastMessageAt ?? item.createdAt)}
              </Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('NewChat')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Pressable style={styles.danger} onPress={confirmWipe}>
        <Text style={styles.dangerText}>Account auf diesem Gerät löschen</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  handleLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  handle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  list: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { color: '#fff', fontSize: 18, marginBottom: 12 },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomColor: '#1a1a1a',
    borderBottomWidth: 1,
  },
  rowMain: { flex: 1, marginRight: 12 },
  rowHandle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  rowPreview: { color: '#888', fontSize: 13 },
  rowTime: { color: '#555', fontSize: 11 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 70,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3d8bfd',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '600', lineHeight: 30 },
  danger: { paddingVertical: 12, alignItems: 'center' },
  dangerText: { color: '#ff5d5d', fontSize: 13 },
});
