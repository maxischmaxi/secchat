use std::sync::Arc;

use crate::error::SecchatError;

#[derive(uniffi::Record, Clone)]
pub struct TorHeader {
    pub name: String,
    pub value: String,
}

#[derive(uniffi::Record, Clone)]
pub struct TorResponse {
    pub status: u16,
    pub body: Vec<u8>,
    pub headers: Vec<TorHeader>,
}

/// Eingebetteter Tor-Client. Phase-3a-Stub — Phase 3b wired
/// `arti_client::TorClient<PreferredRuntime>` mit `DataDirectory` im
/// plattform-spezifischen Cache-Verzeichnis (via Expo-Modul-Callback).
#[derive(uniffi::Object)]
pub struct TorClient {}

#[uniffi::export(async_runtime = "tokio")]
impl TorClient {
    #[uniffi::constructor]
    pub fn new() -> Arc<Self> {
        Arc::new(Self {})
    }

    /// Startet den Tor-Bootstrap (Circuit-Aufbau, Directory-Sync). Blockt
    /// ~10-30 s beim ersten Start; anschliessend schnell durch lokale
    /// Consensus-Caches.
    pub async fn bootstrap(&self) -> Result<(), SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "TorClient.bootstrap".into(),
        })
    }

    /// Schickt einen HTTP-Request ueber einen Tor-Circuit. URL enthaelt
    /// die `.onion`-Adresse; Arti routet direkt (kein DNS-Leak).
    pub async fn request(
        &self,
        _method: String,
        _url: String,
        _body: Option<Vec<u8>>,
        _auth_token: Option<String>,
    ) -> Result<TorResponse, SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "TorClient.request".into(),
        })
    }

    pub async fn shutdown(&self) -> Result<(), SecchatError> {
        Ok(())
    }
}
