import { BACKEND_ONION_URL } from './onion';

/**
 * Ziel-URL des Backends.
 *
 * Phase 2: direkter fetch() gegen die .onion. In der Entwicklung via
 * Orbot/Tor-VPN-App auf dem Geraet. Phase 3 ersetzt den Transport
 * durch ein In-App-Arti-Tor (natives Rust-Modul) — dann ist die App
 * zero-config und kryptografisch am saubersten (kein Drittapp-Proxy,
 * kein System-DNS).
 */
export const API_BASE_URL = BACKEND_ONION_URL;

/** Server blockt bis ~30 s. Client gibt Luft drauf, damit wir nicht vor Server abbrechen. */
export const LONG_POLL_TIMEOUT_MS = 45_000;
