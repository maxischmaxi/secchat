/**
 * secchat Backend als Tor Hidden Service (v3).
 *
 * Erreichbar ausschliesslich ueber das Tor-Netzwerk (Tor Browser,
 * torsocks, Tails, Orbot, ...). Der Hostname ist persistent ueber
 * Redeploys hinweg, solange das Docker-Volume `tor-data` auf der
 * Deploy-VM nicht entfernt wird.
 *
 * Single source of truth lebt in diesem File — synchron halten mit
 * `mobile/onion.ts`, bis ein gemeinsames Workspace-Package existiert.
 */
export const BACKEND_ONION_HOSTNAME =
  "zk7kxh2lsqpwbxlkb3mb6bigwlwx4hogydpnc55cegtsij5jco25ulid.onion";

export const BACKEND_ONION_URL = `http://${BACKEND_ONION_HOSTNAME}`;
