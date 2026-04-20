import { request, toBase64 } from './client';

export async function createGroup(
  token: string,
  groupId: string,
): Promise<{ group_id: string }> {
  return request({
    method: 'POST',
    path: '/groups',
    body: { group_id: groupId },
    token,
  });
}

export interface Welcome {
  recipient: string;
  blob: Uint8Array;
}

export async function submitCommit(
  token: string,
  groupId: string,
  commit: Uint8Array,
  welcomes: Welcome[] = [],
  removed: string[] = [],
): Promise<void> {
  await request({
    method: 'POST',
    path: `/groups/${encodeURIComponent(groupId)}/commit`,
    body: {
      commit: toBase64(commit),
      welcomes: welcomes.map((w) => ({
        recipient: w.recipient,
        blob: toBase64(w.blob),
      })),
      removed,
    },
    token,
  });
}
