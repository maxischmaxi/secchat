//! secchat-core — native Rust module fuer die Mobile-App (Expo).
//!
//! Zwei Verantwortungen:
//!
//! * **MLS** — Gruppen-Messaging via `openmls`. Saemtlicher Schluesselstate
//!   bleibt im Prozess-Speicher bzw. im Secure-Keystore, nie auf dem Server.
//! * **Tor-Transport** — eingebetteter Arti-Client, damit die App die
//!   Backend-.onion erreicht, ohne dass der User Orbot/Tor-VPN installieren
//!   muss. Kryptografisch die sauberste Loesung.
//!
//! Expose erfolgt per UniFFI — React Native importiert die generierten
//! Kotlin-(Android) bzw. Swift-(iOS)-Bindings durch einen Expo-Modul-Wrapper.
//!
//! Stand: Phase 3a. Nur Scaffold — alle Crypto/Netzwerk-Einstiegspunkte
//! geben `SecchatError::NotImplemented` zurueck. `openmls` + `arti-client`
//! werden in Phase 3b eingewoben.

pub mod error;
pub mod identity;
pub mod mls;
pub mod tor;

pub use error::SecchatError;
pub use identity::derive_handle;
pub use mls::{InviteOutcome, MlsClient, MlsGroupHandle, MlsKeyPackage};
pub use tor::{TorClient, TorHeader, TorResponse};

uniffi::setup_scaffolding!();
