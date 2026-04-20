/**
 * MLS-Layer — Platzhalter fuer Phase 3.
 *
 * In Phase 3 werden diese Funktionen durch Aufrufe in ein natives
 * Rust-Modul (OpenMLS via UniFFI) ersetzt, zusammen mit Arti als
 * eingebettetem Tor-Client. Die Signaturen hier entsprechen der
 * geplanten Schnittstelle, damit UI und API-Client bereits dagegen
 * gebaut werden koennen.
 */

export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`MLS.${feature} wird in Phase 3 implementiert (OpenMLS via UniFFI)`);
    this.name = 'NotImplementedError';
  }
}

export interface MLSKeyPackage {
  publicBlob: Uint8Array;
}

export interface MLSGroupHandle {
  groupId: string;
  epoch: number;
}

export async function generateKeyPackages(
  _identityPriv: Uint8Array,
  _count: number,
): Promise<MLSKeyPackage[]> {
  throw new NotImplementedError('generateKeyPackages');
}

export async function createGroup(
  _identityPriv: Uint8Array,
  _groupId: string,
): Promise<MLSGroupHandle> {
  throw new NotImplementedError('createGroup');
}

export async function inviteMembers(
  _group: MLSGroupHandle,
  _keyPackages: Uint8Array[],
): Promise<{ commit: Uint8Array; welcomes: Uint8Array[] }> {
  throw new NotImplementedError('inviteMembers');
}

export async function processWelcome(
  _identityPriv: Uint8Array,
  _welcomeBlob: Uint8Array,
): Promise<MLSGroupHandle> {
  throw new NotImplementedError('processWelcome');
}

export async function processCommit(
  _group: MLSGroupHandle,
  _commitBlob: Uint8Array,
): Promise<MLSGroupHandle> {
  throw new NotImplementedError('processCommit');
}

export async function encryptMessage(
  _group: MLSGroupHandle,
  _plaintext: Uint8Array,
): Promise<Uint8Array> {
  throw new NotImplementedError('encryptMessage');
}

export async function decryptMessage(
  _group: MLSGroupHandle,
  _ciphertext: Uint8Array,
): Promise<Uint8Array> {
  throw new NotImplementedError('decryptMessage');
}
