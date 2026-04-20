import { sha256 } from '@noble/hashes/sha256';

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
const HANDLE_LEN = 12;

/**
 * Identisch zur Backend-Ableitung:
 *   handle = base32(sha256(pubkey))[:12]  (lowercase, ohne Padding)
 *
 * ~60 bit — reicht bei vernuenftiger Nutzerzahl gegen Kollisionen.
 */
export function deriveHandle(pubkey: Uint8Array): string {
  const hash = sha256(pubkey);
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < hash.length && out.length < HANDLE_LEN; i++) {
    value = (value << 8) | hash[i];
    bits += 8;
    while (bits >= 5 && out.length < HANDLE_LEN) {
      bits -= 5;
      out += B32[(value >> bits) & 0x1f];
    }
  }
  return out;
}
