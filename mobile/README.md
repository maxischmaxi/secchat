# mobile

secchat Mobile-App — Expo Dev Client + React Native. MLS-Chat, Auth via
Ed25519-Challenge-Response, Zugriff ueber Tor.

## Struktur

```
mobile/
├── App.tsx                  Root (Navigation + Safe Area)
├── index.ts                 Expo Entry
├── app.json                 Expo Config (new arch, dev-client, secure-store Plugin)
├── src/
│   ├── config/              API-URL + .onion-Konstante
│   ├── crypto/              seed + identity + handle + mls-stubs
│   ├── api/                 Client + typisierte Endpoint-Wrapper
│   ├── storage/             expo-secure-store-Wrapper fuer Seed/Token
│   ├── state/               Zustand-Store fuer Auth
│   ├── navigation/          React-Navigation-Root
│   └── screens/             Welcome / Seed-Display / Confirm / Home / Chat
```

## Transport-Layer

Phase 2 spricht direkt per `fetch()` gegen die Backend-`.onion` — fuer
die Entwicklung braucht das Geraet also einen Tor-Zugang (Orbot auf
Android, Onion-Browser-VPN auf iOS). Phase 3 tauscht den Transport
gegen ein In-App-Arti-Rust-Modul — keine Drittapp-Abhaengigkeit mehr,
keine System-DNS-Anfragen gegen `.onion`. Das ist das kryptografisch
sauberste Setup.

## Einrichtung

```sh
cd mobile
npm install
# Native Projekte generieren (ein-mal pro Maschine / Expo-Upgrade):
npx expo prebuild
# iOS: Pods installieren
cd ios && pod install && cd ..
# Auf Geraet/Emulator starten:
npm run android      # oder
npm run ios
```

Anschliessend einen Dev-Client-Build auf das Geraet spielen und mit
`npm start` den Bundler starten.

## Seed / Handle

- Bei erstem Start wird ein 256-bit Seed generiert (BIP-39 24 Wörter).
- Aus dem Seed wird deterministisch ein Ed25519-Identity-Key abgeleitet
  (HKDF-SHA256 mit Info-String `secchat/identity/v1`).
- Der Handle ist `base32(sha256(pubkey))[:12]` lowercase — identisch
  zur Backend-Ableitung, damit Re-Register idempotent ist.
- Seed + Handle + Session-Token leben im Secure Enclave / Keystore via
  `expo-secure-store` mit `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.

## Offene Punkte fuer Phase 3

- OpenMLS-Rust-Modul mit UniFFI-Bindings (iOS + Android)
- Arti-Tor als weiterer native Baustein im selben Modul
- Echte Chat-UI mit Message-Composer, Long-Poll-Loop
- Group-Invite-Flow (KeyPackages claimen + Welcome senden)
- Multi-Device-Überlegung (bislang single-device-per-handle)
