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
import { uploadKeyPackages } from '@/api/keypackages';
import { getChallenge, verifyChallenge } from '@/api/users';
import { makeKeyPackage } from '@/crypto/keypackage';
import { deriveHandle } from '@/crypto/handle';
import { deriveIdentity, sign } from '@/crypto/identity';
import { seedFromMnemonic } from '@/crypto/seed';
import { deriveX25519 } from '@/crypto/x25519';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/state/auth';
import { saveHandle, saveSeed, saveSessionToken } from '@/storage/keystore';

type Props = NativeStackScreenProps<RootStackParamList, 'SeedConfirm'>;

function pickIndices(total: number, count: number): number[] {
  const idxs = new Set<number>();
  while (idxs.size < count) idxs.add(Math.floor(Math.random() * total));
  return [...idxs].sort((a, b) => a - b);
}

const normalize = (s: string): string =>
  s.normalize('NFKC').trim().toLowerCase();

const KEYPACKAGE_BATCH = 10;

export function SeedConfirmScreen({ route }: Props) {
  const { mnemonic } = route.params;
  const words = useMemo(
    () => mnemonic.split(/\s+/).filter(Boolean).map(normalize),
    [mnemonic],
  );
  const [prompts] = useState(() => pickIndices(words.length, 3));
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const setSession = useAuth((s) => s.setSession);

  const fieldOk = useMemo(() => {
    const out: Record<number, boolean> = {};
    for (const i of prompts) {
      const value = inputs[i] ?? '';
      out[i] = value.length > 0 && normalize(value) === words[i];
    }
    return out;
  }, [prompts, inputs, words]);

  const allMatch = prompts.every((i) => fieldOk[i]);

  async function finish() {
    if (!allMatch || loading) return;
    setLoading(true);
    try {
      const entropy = seedFromMnemonic(mnemonic);
      const ident = deriveIdentity(entropy);
      const x = deriveX25519(entropy);
      const handle = deriveHandle(ident.publicKey);

      // 1) Auth — Challenge-Response
      const { nonce: nonceB64 } = await getChallenge(handle);
      const nonceBytes = fromBase64(nonceB64);
      const sig = sign(ident.privateKey, nonceBytes);
      const { token } = await verifyChallenge(handle, nonceB64, sig);

      // 2) KeyPackages hochladen, damit uns jemand einladen kann
      const kp = makeKeyPackage(ident.privateKey, ident.publicKey, x.publicKey);
      const batch = new Array(KEYPACKAGE_BATCH).fill(kp);
      await uploadKeyPackages(token, batch);

      // 3) Local persist + activate auth
      await saveSeed(mnemonic);
      await saveHandle(handle);
      await saveSessionToken(token);
      setSession(handle, token, mnemonic);
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
            Trag die folgenden Wörter aus deinem Seed ein. Feld wird grün,
            sobald das Wort übereinstimmt.
          </Text>

          {prompts.map((i) => {
            const value = inputs[i] ?? '';
            const hasInput = value.trim().length > 0;
            const ok = fieldOk[i];
            return (
              <View key={i} style={styles.row}>
                <Text style={styles.idx}>Wort {i + 1}</Text>
                <TextInput
                  style={[
                    styles.input,
                    hasInput && (ok ? styles.inputOk : styles.inputBad),
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  spellCheck={false}
                  textContentType="none"
                  importantForAutofill="no"
                  keyboardType="visible-password"
                  placeholder="…"
                  placeholderTextColor="#444"
                  value={value}
                  onChangeText={(t) => setInputs((p) => ({ ...p, [i]: t }))}
                />
                {hasInput ? (
                  <Text style={ok ? styles.markOk : styles.markBad}>
                    {ok ? '✓' : '✗'}
                  </Text>
                ) : (
                  <View style={styles.markSpacer} />
                )}
              </View>
            );
          })}

          <Pressable
            style={[styles.primary, (!allMatch || loading) && styles.disabled]}
            disabled={!allMatch || loading}
            onPress={finish}
          >
            <Text style={styles.primaryText}>
              {loading ? 'Verifiziere + Upload…' : 'Fertig'}
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputOk: { borderColor: '#3dfd8b' },
  inputBad: { borderColor: '#ff5d5d' },
  markOk: {
    color: '#3dfd8b',
    fontSize: 20,
    marginLeft: 10,
    width: 20,
    textAlign: 'center',
  },
  markBad: {
    color: '#ff5d5d',
    fontSize: 20,
    marginLeft: 10,
    width: 20,
    textAlign: 'center',
  },
  markSpacer: { width: 30 },
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
