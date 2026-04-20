import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'SeedDisplay'>;

export function SeedDisplayScreen({ navigation, route }: Props) {
  const { mnemonic, handle } = route.params;
  const words = mnemonic.split(' ');

  async function copy() {
    await Clipboard.setStringAsync(mnemonic);
    Alert.alert(
      'Kopiert',
      'Der Seed liegt in der Zwischenablage — offline sichern, dann aus dem Clipboard löschen.',
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Dein Handle</Text>
        <Text style={styles.handle}>{handle}</Text>

        <View style={styles.warning}>
          <Text style={styles.warningTitle}>Wichtig</Text>
          <Text style={styles.warningText}>
            Dieser Seed ist dein einziger Zugang. Geht er verloren, sind auch
            alle Nachrichten verloren — niemand, auch wir nicht, kann ihn
            wiederherstellen.
          </Text>
        </View>

        <Text style={styles.label}>Recovery-Seed · 24 Wörter</Text>
        <View style={styles.grid}>
          {words.map((w, i) => (
            <View key={i} style={styles.word}>
              <Text style={styles.wordIdx}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.wordText}>{w}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.secondary} onPress={copy}>
          <Text style={styles.secondaryText}>In Zwischenablage kopieren</Text>
        </Pressable>

        <Pressable
          style={styles.primary}
          onPress={() => navigation.replace('SeedConfirm', { mnemonic })}
        >
          <Text style={styles.primaryText}>Ich habe den Seed gesichert</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  body: { padding: 24, paddingBottom: 48 },
  label: {
    color: '#888',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  handle: { color: '#fff', fontSize: 24, fontFamily: 'monospace' },
  warning: {
    backgroundColor: '#3a1a1a',
    borderColor: '#ff5d5d',
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    marginTop: 24,
  },
  warningTitle: { color: '#ff8c8c', fontWeight: '700', marginBottom: 6, fontSize: 14 },
  warningText: { color: '#ffcaca', fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  word: {
    width: '33.33%',
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordIdx: { color: '#666', width: 28, fontSize: 12, fontFamily: 'monospace' },
  wordText: { color: '#fff', fontSize: 15, fontFamily: 'monospace' },
  secondary: { paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  secondaryText: { color: '#aaa', fontSize: 15 },
  primary: {
    backgroundColor: '#3d8bfd',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
