import ExpoModulesCore

/// Phase-3b-Stub. Die echten UniFFI-Swift-Bindings leben unter
/// `ios/Sources/secchat_core.swift` und werden von
/// `native/secchat-core/build.sh` auf macOS erzeugt. Bis dahin wirft
/// jede Methode einen expliziten Fehler, damit JS-seitige Calls laut
/// scheitern statt still falsche Werte zu liefern.
public class SecchatCoreModule: Module {
  private func notReady() throws -> Never {
    throw NSError(
      domain: "SecchatCore", code: -1,
      userInfo: [NSLocalizedDescriptionKey:
        "secchat-core native bindings not generated yet — " +
        "run native/secchat-core/build.sh first."
      ])
  }

  public func definition() -> ModuleDefinition {
    Name("SecchatCore")

    // identity
    Function("deriveHandle") { (_: Data) throws -> String in try notReady() }
    Function("deriveIdentityPrivateKey") { (_: Data) throws -> Data in try notReady() }

    // MLS
    Function("initMls") { (_: Data) throws in try notReady() }
    AsyncFunction("generateKeyPackages") { (_: Int) throws -> [Data] in try notReady() }
    AsyncFunction("createGroup") { (_: String) throws -> [String: Any] in try notReady() }
    AsyncFunction("inviteMembers") {
      (_: [String: Any], _: [Data]) throws -> [String: Any] in try notReady()
    }
    AsyncFunction("processWelcome") { (_: Data) throws -> [String: Any] in try notReady() }
    AsyncFunction("processCommit") {
      (_: [String: Any], _: Data) throws -> [String: Any] in try notReady()
    }
    AsyncFunction("encryptMessage") {
      (_: [String: Any], _: Data) throws -> Data in try notReady()
    }
    AsyncFunction("decryptMessage") {
      (_: [String: Any], _: Data) throws -> Data in try notReady()
    }

    // Tor
    Function("torInit") { () throws in try notReady() }
    AsyncFunction("torBootstrap") { () throws in try notReady() }
    AsyncFunction("torRequest") {
      (_: String, _: String, _: Data?, _: String?) throws -> [String: Any] in try notReady()
    }
    AsyncFunction("torShutdown") { () throws in try notReady() }
  }
}
