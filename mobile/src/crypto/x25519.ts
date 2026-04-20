import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

const HKDF_SALT = new Uint8Array(32);
const HKDF_INFO = new TextEncoder().encode('secchat/x25519/v1');

/**
 * Leitet ein X25519-Keypair deterministisch aus dem Recovery-Seed ab.
 * Eigener Info-String, damit es sich kryptographisch vom Ed25519-
 * Identity-Key unterscheidet — die beiden Keys duerfen aus derselben
 * Entropiequelle stammen, aber nicht das gleiche Material sein.
 */
export function deriveX25519(seed: Uint8Array): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const privateKey = hkdf(sha256, seed, HKDF_SALT, HKDF_INFO, 32);
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/** X25519 ECDH — gibt das rohe 32-Byte-Shared-Secret zurueck. */
export function ecdh(myPriv: Uint8Array, theirPub: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(myPriv, theirPub);
}
