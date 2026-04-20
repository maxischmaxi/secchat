import { request, toBase64 } from './client';

export async function sendMessage(
  token: string,
  groupId: string,
  ciphertext: Uint8Array,
): Promise<void> {
  await request({
    method: 'POST',
    path: `/groups/${encodeURIComponent(groupId)}/messages`,
    body: { ciphertext: toBase64(ciphertext) },
    token,
  });
}
