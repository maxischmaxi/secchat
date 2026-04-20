#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum SecchatError {
    #[error("not implemented yet: {what}")]
    NotImplemented { what: String },

    #[error("mls: {reason}")]
    Mls { reason: String },

    #[error("tor: {reason}")]
    Tor { reason: String },

    #[error("io: {reason}")]
    Io { reason: String },

    #[error("invalid input: {reason}")]
    InvalidInput { reason: String },
}
