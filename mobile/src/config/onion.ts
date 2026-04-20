/**
 * secchat Backend als Tor Hidden Service (v3).
 *
 * In der mobilen App ueber Orbot (Android) oder Tor-VPN auf iOS
 * zu erreichen. Hostname ist persistent ueber Redeploys, solange
 * das Docker-Volume `tor-data` auf der Deploy-VM existiert.
 *
 * Synchron halten mit `web/onion.ts`, bis ein gemeinsames
 * Workspace-Package existiert.
 */
export const BACKEND_ONION_HOSTNAME =
  "zk7kxh2lsqpwbxlkb3mb6bigwlwx4hogydpnc55cegtsij5jco25ulid.onion";

export const BACKEND_ONION_URL = `http://${BACKEND_ONION_HOSTNAME}`;
