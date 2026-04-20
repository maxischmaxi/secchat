import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { ChatScreen } from '@/screens/ChatScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoadingScreen } from '@/screens/LoadingScreen';
import { NewChatScreen } from '@/screens/NewChatScreen';
import { SeedConfirmScreen } from '@/screens/SeedConfirmScreen';
import { SeedDisplayScreen } from '@/screens/SeedDisplayScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { useAuth } from '@/state/auth';
import { useConversations } from '@/state/conversations';
import { startInboxLoop, stopInboxLoop } from '@/state/inbox';
import {
  loadHandle,
  loadSeed,
  loadSessionToken,
} from '@/storage/keystore';

export type RootStackParamList = {
  Welcome: undefined;
  SeedDisplay: { mnemonic: string; handle: string };
  SeedConfirm: { mnemonic: string };
  Home: undefined;
  NewChat: undefined;
  Chat: { groupId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const handle = useAuth((s) => s.handle);
  const token = useAuth((s) => s.token);
  const x25519Priv = useAuth((s) => s.x25519Priv);
  const ready = useAuth((s) => s.ready);
  const setSession = useAuth((s) => s.setSession);
  const markReady = useAuth((s) => s.markReady);
  const reloadConversations = useConversations((s) => s.reload);

  // Rehydriere Session aus SecureStore beim App-Start
  useEffect(() => {
    (async () => {
      try {
        const [h, t, mnemonic] = await Promise.all([
          loadHandle(),
          loadSessionToken(),
          loadSeed(),
        ]);
        if (h && t && mnemonic) setSession(h, t, mnemonic);
      } catch (e) {
        console.warn('[secchat] auth bootstrap failed:', e);
      } finally {
        markReady();
      }
    })();
  }, [markReady, setSession]);

  // Inbox-Loop + Conversations laden solange authed
  useEffect(() => {
    if (!token || !x25519Priv) return;
    reloadConversations();
    startInboxLoop(token, x25519Priv);
    return () => {
      stopInboxLoop();
    };
  }, [token, x25519Priv, reloadConversations]);

  if (!ready) return <LoadingScreen />;

  const authed = Boolean(handle && token);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0d0d0d' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#0d0d0d' },
      }}
    >
      {authed ? (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'secchat' }}
          />
          <Stack.Screen
            name="NewChat"
            component={NewChatScreen}
            options={{ title: 'Neuer Chat' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({ title: route.params.groupId })}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SeedDisplay"
            component={SeedDisplayScreen}
            options={{ title: 'Recovery-Seed', headerBackVisible: false }}
          />
          <Stack.Screen
            name="SeedConfirm"
            component={SeedConfirmScreen}
            options={{ title: 'Bestätigung' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
