import { fromBase64, request, toBase64 } from './client';

export interface RegisterResponse {
  handle: string;
}

export async function registerUser(pubkey: Uint8Array): Promise<RegisterResponse> {
  return request<RegisterResponse>({
    method: 'POST',
    path: '/users',
    body: { pubkey: toBase64(pubkey) },
  });
}

export interface ChallengeResponse {
  nonce: string; // base64-kodierte Bytes
  expires_in: number;
}

export async function getChallenge(handle: string): Promise<ChallengeResponse> {
  return request<ChallengeResponse>({
    method: 'POST',
    path: '/auth/challenge',
    body: { handle },
  });
}

export interface VerifyResponse {
  token: string;
  handle: string;
}

/**
 * Client signed das Nonce-Bytes (roh, nicht base64) und schickt Signatur
 * zusammen mit dem gleichen base64-Nonce zurueck wie im Challenge-Response.
 */
export async function verifyChallenge(
  handle: string,
  nonceBase64: string,
  signature: Uint8Array,
): Promise<VerifyResponse> {
  return request<VerifyResponse>({
    method: 'POST',
    path: '/auth/verify',
    body: {
      handle,
      nonce: nonceBase64,
      signature: toBase64(signature),
    },
  });
}

export { fromBase64, toBase64 };
