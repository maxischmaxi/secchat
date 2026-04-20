import ExpoModulesCore
// UniFFI-generierte Swift-Bindings (durch build.sh unter ios/Sources/).
// Das generierte secchat_core.swift exportiert MlsClient, TorClient, etc.

public class SecchatCoreModule: Module {
  private var mlsClient: MlsClient?
  private var torClient: TorClient?

  private func mls() throws -> MlsClient {
    guard let c = mlsClient else {
      throw NSError(
        domain: "SecchatCore", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "MLS not initialized"])
    }
    return c
  }

  private func tor() throws -> TorClient {
    guard let c = torClient else {
      throw NSError(
        domain: "SecchatCore", code: 2,
        userInfo: [NSLocalizedDescriptionKey: "Tor not initialized"])
    }
    return c
  }

  private func groupFromDict(_ d: [String: Any]) -> MlsGroupHandle {
    let epoch = (d["epoch"] as? NSNumber)?.uint64Value ?? 0
    return MlsGroupHandle(groupId: d["groupId"] as? String ?? "", epoch: epoch)
  }

  private func groupToDict(_ h: MlsGroupHandle) -> [String: Any] {
    return ["groupId": h.groupId, "epoch": NSNumber(value: h.epoch)]
  }

  public func definition() -> ModuleDefinition {
    Name("SecchatCore")

    // --- identity ---

    Function("deriveHandle") { (pubkey: Data) -> String in
      return deriveHandle(pubkey: pubkey)
    }

    Function("deriveIdentityPrivateKey") { (seed: Data) -> Data in
      return deriveIdentityPrivateKey(seed: seed)
    }

    // --- MLS ---

    Function("initMls") { (identityPriv: Data) throws in
      self.mlsClient = try MlsClient(identityPriv: identityPriv)
    }

    AsyncFunction("generateKeyPackages") { (count: Int) throws -> [Data] in
      let c = try self.mls()
      return try c.generateKeyPackages(count: UInt32(count)).map { $0.publicBlob }
    }

    AsyncFunction("createGroup") { (groupId: String) throws -> [String: Any] in
      let h = try self.mls().createGroup(groupId: groupId)
      return self.groupToDict(h)
    }

    AsyncFunction("inviteMembers") {
      (group: [String: Any], keyPackages: [Data]) throws -> [String: Any] in
      let out = try self.mls().inviteMembers(
        group: self.groupFromDict(group),
        keyPackages: keyPackages)
      return [
        "commit": out.commit,
        "welcomes": out.welcomes,
      ]
    }

    AsyncFunction("processWelcome") { (welcomeBlob: Data) throws -> [String: Any] in
      let h = try self.mls().processWelcome(welcomeBlob: welcomeBlob)
      return self.groupToDict(h)
    }

    AsyncFunction("processCommit") {
      (group: [String: Any], commitBlob: Data) throws -> [String: Any] in
      let h = try self.mls().processCommit(
        group: self.groupFromDict(group), commitBlob: commitBlob)
      return self.groupToDict(h)
    }

    AsyncFunction("encryptMessage") {
      (group: [String: Any], plaintext: Data) throws -> Data in
      return try self.mls().encryptMessage(
        group: self.groupFromDict(group), plaintext: plaintext)
    }

    AsyncFunction("decryptMessage") {
      (group: [String: Any], ciphertext: Data) throws -> Data in
      return try self.mls().decryptMessage(
        group: self.groupFromDict(group), ciphertext: ciphertext)
    }

    // --- Tor ---

    Function("torInit") {
      self.torClient = TorClient()
    }

    AsyncFunction("torBootstrap") { () async throws in
      try await self.tor().bootstrap()
    }

    AsyncFunction("torRequest") {
      (method: String, url: String, body: Data?, authToken: String?)
        async throws -> [String: Any] in
      let r = try await self.tor().request(
        method: method, url: url, body: body, authToken: authToken)
      return [
        "status": Int(r.status),
        "body": r.body,
        "headers": r.headers.map { ["name": $0.name, "value": $0.value] },
      ]
    }

    AsyncFunction("torShutdown") { () async throws in
      try await self.tor().shutdown()
    }
  }
}
