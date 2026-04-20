import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { ChatScreen } from '@/screens/ChatScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoadingScreen } from '@/screens/LoadingScreen';
import { SeedConfirmScreen } from '@/screens/SeedConfirmScreen';
import { SeedDisplayScreen } from '@/screens/SeedDisplayScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { useAuth } from '@/state/auth';
import { loadHandle, loadSessionToken } from '@/storage/keystore';

export type RootStackParamList = {
  Welcome: undefined;
  SeedDisplay: { mnemonic: string; handle: string };
  SeedConfirm: { mnemonic: string };
  Home: undefined;
  Chat: { groupId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const handle = useAuth((s) => s.handle);
  const token = useAuth((s) => s.token);
  const ready = useAuth((s) => s.ready);
  const setSession = useAuth((s) => s.setSession);
  const markReady = useAuth((s) => s.markReady);

  useEffect(() => {
    (async () => {
      try {
        const h = await loadHandle();
        const t = await loadSessionToken();
        if (h && t) setSession(h, t);
      } catch (e) {
        // Fehler nicht silent verschlucken — sonst weisser Screen, wenn
        // SecureStore auf dem Emulator/Device z.B. keinen Keystore hat.
        console.warn('[secchat] auth bootstrap failed:', e);
      } finally {
        markReady();
      }
    })();
  }, [markReady, setSession]);

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
