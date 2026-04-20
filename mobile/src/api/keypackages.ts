import { fromBase64, request, toBase64 } from './client';

export async function uploadKeyPackages(
  token: string,
  packages: Uint8Array[],
): Promise<{ ids: number[] }> {
  return request({
    method: 'POST',
    path: '/keypackages',
    body: { packages: packages.map(toBase64) },
    token,
  });
}

export async function claimKeyPackage(
  token: string,
  targetHandle: string,
): Promise<Uint8Array> {
  const res = await request<{ package: string }>({
    method: 'GET',
    path: `/users/${encodeURIComponent(targetHandle)}/keypackage`,
    token,
  });
  return fromBase64(res.package);
}
