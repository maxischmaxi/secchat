import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/state/auth';
import { wipeAll } from '@/storage/keystore';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const handle = useAuth((s) => s.handle);
  const clear = useAuth((s) => s.clear);

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
            clear();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.handleLabel}>Dein Handle</Text>
          <Text style={styles.handle}>{handle}</Text>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Noch keine Konversationen</Text>
          <Text style={styles.placeholderText}>
            MLS-Integration + echtes Chat-Routing kommt in Phase 3.{'\n'}
            Hier kannst du vorab die Chat-UI öffnen.
          </Text>
          <Pressable
            style={styles.secondary}
            onPress={() => navigation.navigate('Chat', { groupId: 'demo' })}
          >
            <Text style={styles.secondaryText}>Demo-Chat öffnen</Text>
          </Pressable>
        </View>

        <Pressable style={styles.danger} onPress={confirmWipe}>
          <Text style={styles.dangerText}>Account auf diesem Gerät löschen</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  body: { flex: 1, padding: 24 },
  header: { marginBottom: 24 },
  handleLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  handle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'monospace',
    marginTop: 6,
  },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderTitle: { color: '#fff', fontSize: 18, marginBottom: 12 },
  placeholderText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  secondary: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  secondaryText: { color: '#ccc', fontSize: 15 },
  danger: { paddingVertical: 14, alignItems: 'center' },
  dangerText: { color: '#ff5d5d', fontSize: 14 },
});
