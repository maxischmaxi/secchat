import { BACKEND_ONION_URL } from './onion';

/**
 * Ziel-URL des Backends.
 *
 * Produktion: immer die Tor-.onion.
 *
 * Dev-Override via `mobile/.env.local`:
 *
 *     EXPO_PUBLIC_API_BASE=http://10.0.2.2:8080
 *
 * `10.0.2.2` ist aus Sicht des Android-Emulators die Host-Maschine.
 * In einem zweiten Terminal laeuft dabei:
 *
 *     ssh -L 8080:127.0.0.1:8080 root@178.104.184.58
 *
 * Der Tunnel reicht den Backend-Port vom Docker-Compose auf dem Host
 * durch. Damit sprechen wir im Dev-Modus direkt gegen das Backend,
 * ohne einen Tor-Client auf dem Geraet, und ohne das Backend ins
 * Clearnet zu exponieren.
 *
 * Phase 3c ersetzt das dann durch embedded Arti — dann ist dieser
 * Override nicht mehr noetig.
 */
const DEV_API_BASE = process.env.EXPO_PUBLIC_API_BASE;

export const API_BASE_URL = DEV_API_BASE ?? BACKEND_ONION_URL;

/** Server blockt bis ~30 s. Client gibt Luft drauf, damit wir nicht vor Server abbrechen. */
export const LONG_POLL_TIMEOUT_MS = 45_000;
