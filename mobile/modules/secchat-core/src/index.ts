import { requireNativeModule } from 'expo-modules-core';

/**
 * Typisiertes Handle auf die nativen Bindings des Rust-Crates
 * `native/secchat-core` (via UniFFI → Kotlin/Swift → Expo-Modul).
 *
 * Die JS-Stubs in `mobile/src/crypto/mls.ts` werden in Phase 3c gegen
 * diese Funktionen getauscht — Signaturen sind kompatibel.
 */

export interface MlsGroupHandle {
  groupId: string;
  epoch: number;
}

export interface InviteOutcome {
  commit: Uint8Array;
  welcomes: Uint8Array[];
}

export interface TorHeader {
  name: string;
  value: string;
}

export interface TorResponse {
  status: number;
  body: Uint8Array;
  headers: TorHeader[];
}

interface NativeSecchatCore {
  // identity — Rust-Implementierung bereits komplett, bit-identisch zur JS-Version
  deriveHandle(pubkey: Uint8Array): string;
  deriveIdentityPrivateKey(seed: Uint8Array): Uint8Array;

  // MLS (stateful — initMls legt den Client an)
  initMls(identityPriv: Uint8Array): void;
  generateKeyPackages(count: number): Promise<Uint8Array[]>;
  createGroup(groupId: string): Promise<MlsGroupHandle>;
  inviteMembers(
    group: MlsGroupHandle,
    keyPackages: Uint8Array[],
  ): Promise<InviteOutcome>;
  processWelcome(welcomeBlob: Uint8Array): Promise<MlsGroupHandle>;
  processCommit(
    group: MlsGroupHandle,
    commitBlob: Uint8Array,
  ): Promise<MlsGroupHandle>;
  encryptMessage(
    group: MlsGroupHandle,
    plaintext: Uint8Array,
  ): Promise<Uint8Array>;
  decryptMessage(
    group: MlsGroupHandle,
    ciphertext: Uint8Array,
  ): Promise<Uint8Array>;

  // Tor (eingebetteter Arti-Client)
  torInit(): void;
  torBootstrap(): Promise<void>;
  torRequest(
    method: string,
    url: string,
    body: Uint8Array | null,
    authToken: string | null,
  ): Promise<TorResponse>;
  torShutdown(): Promise<void>;
}

const N = requireNativeModule<NativeSecchatCore>('SecchatCore');

// --- identity ---

export const deriveHandle = (pubkey: Uint8Array): string =>
  N.deriveHandle(pubkey);

export const deriveIdentityPrivateKey = (seed: Uint8Array): Uint8Array =>
  N.deriveIdentityPrivateKey(seed);

// --- MLS ---

export const initMls = (identityPriv: Uint8Array): void =>
  N.initMls(identityPriv);

export const generateKeyPackages = (count: number): Promise<Uint8Array[]> =>
  N.generateKeyPackages(count);

export const createGroup = (groupId: string): Promise<MlsGroupHandle> =>
  N.createGroup(groupId);

export const inviteMembers = (
  group: MlsGroupHandle,
  keyPackages: Uint8Array[],
): Promise<InviteOutcome> => N.inviteMembers(group, keyPackages);

export const processWelcome = (
  welcomeBlob: Uint8Array,
): Promise<MlsGroupHandle> => N.processWelcome(welcomeBlob);

export const processCommit = (
  group: MlsGroupHandle,
  commitBlob: Uint8Array,
): Promise<MlsGroupHandle> => N.processCommit(group, commitBlob);

export const encryptMessage = (
  group: MlsGroupHandle,
  plaintext: Uint8Array,
): Promise<Uint8Array> => N.encryptMessage(group, plaintext);

export const decryptMessage = (
  group: MlsGroupHandle,
  ciphertext: Uint8Array,
): Promise<Uint8Array> => N.decryptMessage(group, ciphertext);

// --- Tor ---

export const torInit = (): void => N.torInit();
export const torBootstrap = (): Promise<void> => N.torBootstrap();
export const torRequest = (
  method: string,
  url: string,
  body: Uint8Array | null,
  authToken: string | null,
): Promise<TorResponse> => N.torRequest(method, url, body, authToken);
export const torShutdown = (): Promise<void> => N.torShutdown();
