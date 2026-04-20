import * as ed from '@noble/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';

// @noble/ed25519 v2 haelt die Hash-Impl bewusst steckbar, weil RN
// kein SubtleCrypto hat. Wir wiren sha512 aus @noble/hashes ein.
ed.etc.sha512Sync = (...m: Uint8Array[]) =>
  sha512(ed.etc.concatBytes(...m));

const HKDF_SALT = new Uint8Array(32); // Seed ist bereits random — kein zusaetzlicher Salt noetig
const HKDF_INFO = new TextEncoder().encode('secchat/identity/v1');

/**
 * Deterministische Ableitung der Identity aus dem 256-bit Seed.
 *
 *   privKey = HKDF-SHA256(seed, salt=0, info="secchat/identity/v1", 32)
 *   pubKey  = Ed25519(privKey)
 *
 * Gleicher Seed ⇒ gleiches Keypair ⇒ gleicher Backend-Handle.
 * Damit reicht der Seed allein zum Wiederherstellen.
 */
export function deriveIdentity(seed: Uint8Array): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const privateKey = hkdf(sha256, seed, HKDF_SALT, HKDF_INFO, 32);
  const publicKey = ed.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/** Signiert Bytes mit dem Identity-Private-Key (fuer Challenge-Response). */
export function sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
  return ed.sign(message, privateKey);
}
