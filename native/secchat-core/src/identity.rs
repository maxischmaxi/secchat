use hkdf::Hkdf;
use sha2::{Digest, Sha256};

const HKDF_INFO: &[u8] = b"secchat/identity/v1";
const HANDLE_LEN: usize = 12;
const B32_ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyz234567";

/// Handle-Ableitung — identisch zur Mobile-TS-Version:
///
///     handle = base32(sha256(pubkey))[:12]   (lowercase, ohne Padding)
#[uniffi::export]
pub fn derive_handle(pubkey: Vec<u8>) -> String {
    let hash = Sha256::digest(&pubkey);
    let mut out = String::with_capacity(HANDLE_LEN);
    let mut bits: u32 = 0;
    let mut value: u32 = 0;
    for b in hash.iter() {
        value = (value << 8) | (*b as u32);
        bits += 8;
        while bits >= 5 && out.len() < HANDLE_LEN {
            bits -= 5;
            let idx = ((value >> bits) & 0x1f) as usize;
            out.push(B32_ALPHABET[idx] as char);
        }
    }
    out
}

/// Leitet den 32-Byte-Identity-Private-Key aus dem Seed ab — identisch zur
/// Mobile-TS-Ableitung (`HKDF-SHA256(seed, salt=0, info="secchat/identity/v1")`).
#[uniffi::export]
pub fn derive_identity_private_key(seed: Vec<u8>) -> Vec<u8> {
    let hk = Hkdf::<Sha256>::new(Some(&[0u8; 32]), &seed);
    let mut out = vec![0u8; 32];
    hk.expand(HKDF_INFO, &mut out)
        .expect("HKDF 32-byte output fits");
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn handle_is_twelve_lowercase_base32_chars() {
        let h = derive_handle(vec![0u8; 32]);
        assert_eq!(h.len(), 12);
        assert!(h.chars().all(|c| B32_ALPHABET.contains(&(c as u8))));
    }

    #[test]
    fn identity_derivation_is_deterministic() {
        let seed = vec![7u8; 32];
        assert_eq!(
            derive_identity_private_key(seed.clone()),
            derive_identity_private_key(seed),
        );
    }
}
