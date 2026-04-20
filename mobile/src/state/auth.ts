import { create } from 'zustand';

import { deriveIdentity } from '@/crypto/identity';
import { seedFromMnemonic } from '@/crypto/seed';
import { deriveX25519 } from '@/crypto/x25519';

interface AuthState {
  handle: string | null;
  token: string | null;
  identityPriv: Uint8Array | null;
  identityPub: Uint8Array | null;
  x25519Priv: Uint8Array | null;
  x25519Pub: Uint8Array | null;
  ready: boolean;
  setSession: (handle: string, token: string, mnemonic: string) => void;
  clear: () => void;
  markReady: () => void;
}

/**
 * Zustand-Store fuer den Auth-State. Die aus dem Seed abgeleiteten
 * Private-Keys leben NUR in memory — persistiert wird ausschliesslich
 * die Mnemonic (im SecureStore). Beim App-Start rehydriert der
 * RootNavigator aus Mnemonic + Handle + Token.
 */
export const useAuth = create<AuthState>((set) => ({
  handle: null,
  token: null,
  identityPriv: null,
  identityPub: null,
  x25519Priv: null,
  x25519Pub: null,
  ready: false,
  setSession: (handle, token, mnemonic) => {
    const entropy = seedFromMnemonic(mnemonic);
    const ident = deriveIdentity(entropy);
    const x = deriveX25519(entropy);
    set({
      handle,
      token,
      identityPriv: ident.privateKey,
      identityPub: ident.publicKey,
      x25519Priv: x.privateKey,
      x25519Pub: x.publicKey,
    });
  },
  clear: () =>
    set({
      handle: null,
      token: null,
      identityPriv: null,
      identityPub: null,
      x25519Priv: null,
      x25519Pub: null,
    }),
  markReady: () => set({ ready: true }),
}));
