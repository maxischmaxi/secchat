import * as ed from '@noble/ed25519';

import { deriveHandle } from './handle';
import { sign } from './identity';

/**
 * Simplified KeyPackage fuer das Phase-3c-MVP.
 *
 * Format (128 Bytes):
 *   [ identityPub(32) || x25519Pub(32) || ed25519Sig(64) ]
 *
 * Die Signatur ist ueber `x25519Pub` mit dem Identity-Private-Key.
 * Empfaenger kann so verifizieren:
 *   1. deriveHandle(identityPub) == erwarteter Handle
 *   2. ed25519.verify(sig, x25519Pub, identityPub)
 */
const KP_LEN = 32 + 32 + 64;

export function makeKeyPackage(
  identityPriv: Uint8Array,
  identityPub: Uint8Array,
  x25519Pub: Uint8Array,
): Uint8Array {
  const sig = sign(identityPriv, x25519Pub);
  const out = new Uint8Array(KP_LEN);
  out.set(identityPub, 0);
  out.set(x25519Pub, 32);
  out.set(sig, 64);
  return out;
}

/**
 * Verifiziert den Blob und gibt die Inhalte zurueck. Wirft, wenn Handle
 * nicht passt oder Signatur ungueltig ist.
 */
export function verifyKeyPackage(
  blob: Uint8Array,
  expectedHandle: string,
): { identityPub: Uint8Array; x25519Pub: Uint8Array } {
  if (blob.length !== KP_LEN) {
    throw new Error(`invalid keypackage length: ${blob.length}`);
  }
  const identityPub = blob.slice(0, 32);
  const x25519Pub = blob.slice(32, 64);
  const sig = blob.slice(64, 128);

  const handle = deriveHandle(identityPub);
  if (handle !== expectedHandle) {
    throw new Error(
      `keypackage handle mismatch: expected ${expectedHandle}, got ${handle}`,
    );
  }
  if (!ed.verify(sig, x25519Pub, identityPub)) {
    throw new Error('invalid keypackage signature');
  }
  return { identityPub, x25519Pub };
}
