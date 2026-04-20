import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toBase64 } from '@/api/client';
import { createGroup, submitCommit } from '@/api/groups';
import { claimKeyPackage } from '@/api/keypackages';
import { generateChatKey, wrapChatKey } from '@/crypto/chat';
import { verifyKeyPackage } from '@/crypto/keypackage';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/state/auth';
import { useConversations } from '@/state/conversations';

type Props = NativeStackScreenProps<RootStackParamList, 'NewChat'>;

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';

async function randomGroupId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(10);
  let out = '';
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5 && out.length < 16) {
      bits -= 5;
      out += B32[(value >> bits) & 0x1f];
    }
  }
  return out;
}

export function NewChatScreen({ navigation }: Props) {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const token = useAuth((s) => s.token);
  const myX25519Priv = useAuth((s) => s.x25519Priv);
  const myX25519Pub = useAuth((s) => s.x25519Pub);
  const myHandle = useAuth((s) => s.handle);
  const addConversation = useConversations((s) => s.addConversation);

  async function invite() {
    const target = handle.trim().toLowerCase();
    if (!target || target === myHandle) {
      Alert.alert('Ungueltig', 'Handle eingeben (nicht dein eigener).');
      return;
    }
    if (!token || !myX25519Priv || !myX25519Pub) return;
    setLoading(true);
    try {
      // 1) KeyPackage fuer den Empfaenger abholen + verifizieren
      const kpBlob = await claimKeyPackage(token, target);
      const { x25519Pub: targetX } = verifyKeyPackage(kpBlob, target);

      // 2) Frische Gruppe + Chat-Key
      const groupId = await randomGroupId();
      const chatKey = await generateChatKey();

      // 3) Gruppe beim Backend anlegen (wir sind alleiniges Mitglied)
      await createGroup(token, groupId);

      // 4) Welcome-Blob fuer den Empfaenger — Chat-Key wird per X25519-
      //    ECDH + ChaCha20Poly1305 verpackt.
      const welcome = await wrapChatKey(
        myX25519Priv,
        myX25519Pub,
        targetX,
        chatKey,
      );

      // 5) Commit + Welcome an Backend. Server fan-outet den Welcome
      //    an den Empfaenger und nimmt ihn in group_members auf.
      await submitCommit(token, groupId, new Uint8Array(0), [
        { recipient: target, blob: welcome },
      ]);

      // 6) Lokal persistieren + Chat oeffnen
      await addConversation({
        groupId,
        members: [target],
        chatKeyB64: toBase64(chatKey),
        createdAt: Date.now(),
      });
      navigation.replace('Chat', { groupId });
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
        <View style={styles.body}>
          <Text style={styles.label}>Handle des Empfängers</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            importantForAutofill="no"
            keyboardType="visible-password"
            placeholder="abc23ef7ghij"
            placeholderTextColor="#444"
            value={handle}
            onChangeText={setHandle}
          />

          <Text style={styles.note}>
            12-stelliger base32-Handle des anderen Nutzers. Er muss sich schon
            einmal angemeldet haben, damit sein KeyPackage auf dem Server liegt.
          </Text>

          <Pressable
            style={[styles.primary, (loading || !handle.trim()) && styles.disabled]}
            disabled={loading || !handle.trim()}
            onPress={invite}
          >
            <Text style={styles.primaryText}>
              {loading ? 'Lade KeyPackage…' : 'Chat starten'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  body: { flex: 1, padding: 24 },
  label: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 14,
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 16,
  },
  note: { color: '#666', fontSize: 13, marginTop: 12, lineHeight: 18 },
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
