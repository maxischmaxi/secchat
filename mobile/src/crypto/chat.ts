import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import * as Crypto from 'expo-crypto';

import { ecdh } from './x25519';

const WRAP_INFO = new TextEncoder().encode('secchat/chatkey-wrap/v1');

/** Generiert einen frischen symmetrischen 256-bit Chat-Key. */
export async function generateChatKey(): Promise<Uint8Array> {
  return Crypto.getRandomBytesAsync(32);
}

/**
 * Verpackt den Chat-Key fuer ein neues Gruppenmitglied.
 *
 * Blob-Format:
 *   [ senderX25519Pub(32) || nonce(12) || ChaCha20Poly1305(wrapKey, chatKey) ]
 *
 * wrapKey = HKDF-SHA256(ecdh(mine, theirs), salt=senderPub, info)
 */
export async function wrapChatKey(
  senderPriv: Uint8Array,
  senderPub: Uint8Array,
  recipientPub: Uint8Array,
  chatKey: Uint8Array,
): Promise<Uint8Array> {
  const shared = ecdh(senderPriv, recipientPub);
  const wrapKey = hkdf(sha256, shared, senderPub, WRAP_INFO, 32);
  const nonce = await Crypto.getRandomBytesAsync(12);
  const ct = chacha20poly1305(wrapKey, nonce).encrypt(chatKey);
  const out = new Uint8Array(32 + 12 + ct.length);
  out.set(senderPub, 0);
  out.set(nonce, 32);
  out.set(ct, 44);
  return out;
}

/** Dekodiert einen Welcome-Blob + entschluesselt den Chat-Key. */
export function unwrapChatKey(
  myPriv: Uint8Array,
  blob: Uint8Array,
): { senderPub: Uint8Array; chatKey: Uint8Array } {
  if (blob.length < 32 + 12 + 16) throw new Error('wrap blob too short');
  const senderPub = blob.slice(0, 32);
  const nonce = blob.slice(32, 44);
  const ct = blob.slice(44);
  const shared = ecdh(myPriv, senderPub);
  const wrapKey = hkdf(sha256, shared, senderPub, WRAP_INFO, 32);
  const chatKey = chacha20poly1305(wrapKey, nonce).decrypt(ct);
  return { senderPub, chatKey };
}

/**
 * Verschluesselt eine einzelne Nachricht mit dem Gruppen-Chat-Key.
 * Format: [ nonce(12) || ChaCha20Poly1305(chatKey, plaintext) ]
 */
export async function encryptMessage(
  chatKey: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const nonce = await Crypto.getRandomBytesAsync(12);
  const ct = chacha20poly1305(chatKey, nonce).encrypt(plaintext);
  const out = new Uint8Array(12 + ct.length);
  out.set(nonce, 0);
  out.set(ct, 12);
  return out;
}

export function decryptMessage(
  chatKey: Uint8Array,
  blob: Uint8Array,
): Uint8Array {
  if (blob.length < 12 + 16) throw new Error('message blob too short');
  const nonce = blob.slice(0, 12);
  const ct = blob.slice(12);
  return chacha20poly1305(chatKey, nonce).decrypt(ct);
}
