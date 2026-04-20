import * as SecureStore from 'expo-secure-store';

// SecureStore-Keys duerfen nur [a-zA-Z0-9._-] enthalten — Doppelpunkt
// wirft "Invalid key". Darum Unterstrich statt Namespace-Doppelpunkt.
const KEY_SEED = 'secchat_seed';
const KEY_HANDLE = 'secchat_handle';
const KEY_SESSION_TOKEN = 'secchat_session_token';

/**
 * Legt den Recovery-Seed im Secure Enclave (iOS) / Android Keystore ab.
 * Inhalt ist an das spezifische Geraet gebunden und wird bei App-
 * Uninstall geloescht (Android) bzw. beim Wipe (iOS).
 */
export async function saveSeed(mnemonic: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_SEED, mnemonic, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSeed(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_SEED);
}

export async function saveHandle(handle: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_HANDLE, handle);
}

export async function loadHandle(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_HANDLE);
}

export async function saveSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_SESSION_TOKEN, token);
}

export async function loadSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_SESSION_TOKEN);
}

/**
 * Loescht alle App-Credentials — "Key weg = Messages weg".
 * Fuer den Account-Reset oder beim expliziten Logout.
 */
export async function wipeAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_SEED),
    SecureStore.deleteItemAsync(KEY_HANDLE),
    SecureStore.deleteItemAsync(KEY_SESSION_TOKEN),
  ]);
}
