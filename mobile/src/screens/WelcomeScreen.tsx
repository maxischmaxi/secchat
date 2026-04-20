import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { registerUser } from '@/api/users';
import { deriveIdentity } from '@/crypto/identity';
import { generateSeed } from '@/crypto/seed';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    setLoading(true);
    try {
      const { mnemonic, entropy } = await generateSeed();
      const { publicKey } = deriveIdentity(entropy);
      const { handle } = await registerUser(publicKey);
      navigation.replace('SeedDisplay', { mnemonic, handle });
    } catch (e) {
      Alert.alert('Fehler', String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <Text style={styles.title}>secchat</Text>
        <Text style={styles.subtitle}>
          Anonymer Messenger. End-to-End verschlüsselt.{'\n'}
          Keine Accounts, keine Telefonnummer.
        </Text>

        <Pressable
          style={[styles.primary, loading && styles.disabled]}
          onPress={createAccount}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            {loading ? 'Generiere Schlüssel…' : 'Neu anlegen'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() =>
            Alert.alert(
              'Noch nicht verfügbar',
              'Wiederherstellung mit Recovery-Seed folgt in Phase 3.',
            )
          }
        >
          <Text style={styles.secondaryText}>
            Mit Recovery-Seed wiederherstellen
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 40, fontWeight: '700', marginBottom: 12 },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 48,
    lineHeight: 22,
  },
  primary: {
    backgroundColor: '#3d8bfd',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: '#aaa', fontSize: 15 },
});
