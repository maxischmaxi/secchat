import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fromBase64 } from '@/api/client';
import { getChallenge, verifyChallenge } from '@/api/users';
import { deriveHandle } from '@/crypto/handle';
import { deriveIdentity, sign } from '@/crypto/identity';
import { seedFromMnemonic } from '@/crypto/seed';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/state/auth';
import { saveHandle, saveSeed, saveSessionToken } from '@/storage/keystore';

type Props = NativeStackScreenProps<RootStackParamList, 'SeedConfirm'>;

function pickIndices(total: number, count: number): number[] {
  const idxs = new Set<number>();
  while (idxs.size < count) idxs.add(Math.floor(Math.random() * total));
  return [...idxs].sort((a, b) => a - b);
}

export function SeedConfirmScreen({ route }: Props) {
  const { mnemonic } = route.params;
  const words = mnemonic.split(' ');
  const [prompts] = useState(() => pickIndices(words.length, 3));
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const setSession = useAuth((s) => s.setSession);

  const allMatch = useMemo(
    () =>
      prompts.every(
        (i) => (inputs[i] ?? '').trim().toLowerCase() === words[i],
      ),
    [prompts, inputs, words],
  );

  async function finish() {
    if (!allMatch || loading) return;
    setLoading(true);
    try {
      const entropy = seedFromMnemonic(mnemonic);
      const { privateKey, publicKey } = deriveIdentity(entropy);
      const handle = deriveHandle(publicKey);

      const { nonce: nonceB64 } = await getChallenge(handle);
      const nonceBytes = fromBase64(nonceB64);
      const sig = sign(privateKey, nonceBytes);
      const { token } = await verifyChallenge(handle, nonceB64, sig);

      await saveSeed(mnemonic);
      await saveHandle(handle);
      await saveSessionToken(token);
      setSession(handle, token);
    } catch (e) {
      Alert.alert('Fehler', String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Bitte bestätigen</Text>
          <Text style={styles.subtitle}>
            Trag die folgenden Wörter aus deinem Seed ein, um zu zeigen dass du
            ihn gesichert hast.
          </Text>

          {prompts.map((i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.idx}>Wort {i + 1}</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="…"
                placeholderTextColor="#444"
                value={inputs[i] ?? ''}
                onChangeText={(t) => setInputs((p) => ({ ...p, [i]: t }))}
              />
            </View>
          ))}

          <Pressable
            style={[
              styles.primary,
              (!allMatch || loading) && styles.disabled,
            ]}
            disabled={!allMatch || loading}
            onPress={finish}
          >
            <Text style={styles.primaryText}>
              {loading ? 'Verifiziere…' : 'Fertig'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  body: { padding: 24, paddingBottom: 48 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 15, marginBottom: 24, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  idx: { color: '#888', width: 72, fontSize: 13 },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  primary: {
    backgroundColor: '#3d8bfd',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
