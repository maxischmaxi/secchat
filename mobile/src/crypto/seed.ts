import * as Crypto from 'expo-crypto';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

/**
 * Recovery-Seed. 256 bit Entropie aus dem System-CSPRNG, kodiert als
 * BIP-39 24-Wort-Mnemonic. Einziger Backup-Pfad — verliert der User
 * den Seed, ist sein Identity-Key unwiederbringlich und damit jede
 * Nachricht, die mit diesem Key zu entschluesseln waere.
 */
export async function generateSeed(): Promise<{
  mnemonic: string;
  entropy: Uint8Array;
}> {
  const entropy = await Crypto.getRandomBytesAsync(32);
  const mnemonic = bip39.entropyToMnemonic(entropy, wordlist);
  return { mnemonic, entropy };
}

/**
 * Validiert + dekodiert eine Recovery-Mnemonic. Wirft bei ungueltiger
 * Wortliste oder Pruefsumme.
 */
export function seedFromMnemonic(mnemonic: string): Uint8Array {
  const trimmed = mnemonic.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!bip39.validateMnemonic(trimmed, wordlist)) {
    throw new Error('ungueltige Recovery-Mnemonic');
  }
  return bip39.mnemonicToEntropy(trimmed, wordlist);
}
