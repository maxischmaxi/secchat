import { create } from 'zustand';

interface AuthState {
  handle: string | null;
  token: string | null;
  ready: boolean;
  setSession: (handle: string, token: string) => void;
  clear: () => void;
  markReady: () => void;
}

/**
 * Kleiner Zustand-Store fuer Auth-State. Navigation re-renderd, sobald
 * {handle, token} gesetzt sind → switch von Unauth-Stack nach Auth-Stack.
 */
export const useAuth = create<AuthState>((set) => ({
  handle: null,
  token: null,
  ready: false,
  setSession: (handle, token) => set({ handle, token }),
  clear: () => set({ handle: null, token: null }),
  markReady: () => set({ ready: true }),
}));
