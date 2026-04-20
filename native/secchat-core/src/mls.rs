use std::sync::Arc;

use crate::error::SecchatError;

#[derive(uniffi::Record, Clone)]
pub struct MlsKeyPackage {
    pub public_blob: Vec<u8>,
}

#[derive(uniffi::Record, Clone)]
pub struct MlsGroupHandle {
    pub group_id: String,
    pub epoch: u64,
}

#[derive(uniffi::Record, Clone)]
pub struct InviteOutcome {
    pub commit: Vec<u8>,
    pub welcomes: Vec<Vec<u8>>,
}

/// `MlsClient` haelt Identity- und Gruppen-State. Phase-3a-Stub —
/// Phase 3b wired `openmls_rust_crypto::OpenMlsRustCrypto` als Provider
/// und persistiert den KeyStore via Secure-Storage-Callback ans Expo-Modul.
#[derive(uniffi::Object)]
pub struct MlsClient {
    _identity_priv: Vec<u8>,
}

#[uniffi::export]
impl MlsClient {
    /// Instanziiert einen Client aus dem 32-Byte-Identity-Private-Key
    /// (abgeleitet aus dem Recovery-Seed, siehe `derive_identity_private_key`).
    #[uniffi::constructor]
    pub fn new(identity_priv: Vec<u8>) -> Result<Arc<Self>, SecchatError> {
        if identity_priv.len() != 32 {
            return Err(SecchatError::InvalidInput {
                reason: format!(
                    "identity_priv must be 32 bytes, got {}",
                    identity_priv.len()
                ),
            });
        }
        Ok(Arc::new(Self {
            _identity_priv: identity_priv,
        }))
    }

    pub fn generate_key_packages(
        &self,
        _count: u32,
    ) -> Result<Vec<MlsKeyPackage>, SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "MlsClient.generate_key_packages".into(),
        })
    }

    pub fn create_group(
        &self,
        _group_id: String,
    ) -> Result<MlsGroupHandle, SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "MlsClient.create_group".into(),
        })
    }

    pub fn invite_members(
        &self,
        _group: MlsGroupHandle,
        _key_packages: Vec<Vec<u8>>,
    ) -> Result<InviteOutcome, SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "MlsClient.invite_members".into(),
        })
    }

    pub fn process_welcome(
        &self,
        _welcome_blob: Vec<u8>,
    ) -> Result<MlsGroupHandle, SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "MlsClient.process_welcome".into(),
        })
    }

    pub fn process_commit(
        &self,
        _group: MlsGroupHandle,
        _commit_blob: Vec<u8>,
    ) -> Result<MlsGroupHandle, SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "MlsClient.process_commit".into(),
        })
    }

    pub fn encrypt_message(
        &self,
        _group: MlsGroupHandle,
        _plaintext: Vec<u8>,
    ) -> Result<Vec<u8>, SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "MlsClient.encrypt_message".into(),
        })
    }

    pub fn decrypt_message(
        &self,
        _group: MlsGroupHandle,
        _ciphertext: Vec<u8>,
    ) -> Result<Vec<u8>, SecchatError> {
        Err(SecchatError::NotImplemented {
            what: "MlsClient.decrypt_message".into(),
        })
    }
}
