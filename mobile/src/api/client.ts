import { API_BASE_URL } from '@/config/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    const msg =
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: unknown }).error)
        : `http ${status}`;
    super(msg);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Zentraler Fetch-Wrapper. Wird in Phase 3 durch einen Transport
 * ersetzt, der ueber den In-App-Arti-Tor-Client geht. Die API-Module
 * darueber bleiben identisch.
 */
export async function request<T = unknown>(opts: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const timer = opts.timeoutMs
    ? setTimeout(() => controller.abort(), opts.timeoutMs)
    : null;

  // chain external signal into our controller
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort());
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  try {
    const res = await fetch(`${API_BASE_URL}${opts.path}`, {
      method: opts.method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!res.ok) throw new ApiError(res.status, parsed);
    return parsed as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// --- Base64 helpers (RN 0.76 hat native btoa/atob) ----------------------

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return globalThis.btoa(bin);
}

export function fromBase64(s: string): Uint8Array {
  const bin = globalThis.atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
