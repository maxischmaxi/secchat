package com.secchat.core

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// UniFFI-generierte Bindings (durch build.sh unter android/src/main/java/uniffi/secchat_core/)
import uniffi.secchat_core.MlsClient
import uniffi.secchat_core.MlsGroupHandle as UMlsGroupHandle
import uniffi.secchat_core.TorClient
import uniffi.secchat_core.deriveHandle as uniffiDeriveHandle
import uniffi.secchat_core.deriveIdentityPrivateKey as uniffiDerivePrivKey

class SecchatCoreModule : Module() {
  private var mlsClient: MlsClient? = null
  private var torClient: TorClient? = null

  private fun mls(): MlsClient =
    mlsClient ?: throw IllegalStateException("MLS not initialized — call initMls first")

  private fun tor(): TorClient =
    torClient ?: throw IllegalStateException("Tor not initialized — call torInit first")

  private fun groupFromMap(m: Map<String, Any?>): UMlsGroupHandle =
    UMlsGroupHandle(
      groupId = m["groupId"] as String,
      epoch = (m["epoch"] as Number).toLong().toULong(),
    )

  private fun groupToMap(h: UMlsGroupHandle): Map<String, Any> =
    mapOf("groupId" to h.groupId, "epoch" to h.epoch.toLong())

  override fun definition() = ModuleDefinition {
    Name("SecchatCore")

    // --- identity ---

    Function("deriveHandle") { pubkey: ByteArray ->
      uniffiDeriveHandle(pubkey)
    }

    Function("deriveIdentityPrivateKey") { seed: ByteArray ->
      uniffiDerivePrivKey(seed)
    }

    // --- MLS ---

    Function("initMls") { identityPriv: ByteArray ->
      mlsClient = MlsClient(identityPriv)
    }

    AsyncFunction("generateKeyPackages") { count: Int ->
      mls().generateKeyPackages(count.toUInt()).map { it.publicBlob }
    }

    AsyncFunction("createGroup") { groupId: String ->
      groupToMap(mls().createGroup(groupId))
    }

    AsyncFunction("inviteMembers") { group: Map<String, Any?>, keyPackages: List<ByteArray> ->
      val out = mls().inviteMembers(groupFromMap(group), keyPackages)
      mapOf(
        "commit" to out.commit,
        "welcomes" to out.welcomes,
      )
    }

    AsyncFunction("processWelcome") { welcomeBlob: ByteArray ->
      groupToMap(mls().processWelcome(welcomeBlob))
    }

    AsyncFunction("processCommit") { group: Map<String, Any?>, commitBlob: ByteArray ->
      groupToMap(mls().processCommit(groupFromMap(group), commitBlob))
    }

    AsyncFunction("encryptMessage") { group: Map<String, Any?>, plaintext: ByteArray ->
      mls().encryptMessage(groupFromMap(group), plaintext)
    }

    AsyncFunction("decryptMessage") { group: Map<String, Any?>, ciphertext: ByteArray ->
      mls().decryptMessage(groupFromMap(group), ciphertext)
    }

    // --- Tor ---

    Function("torInit") {
      torClient = TorClient()
    }

    AsyncFunction("torBootstrap") {
      tor().bootstrap()
    }

    AsyncFunction("torRequest") {
      method: String, url: String, body: ByteArray?, authToken: String? ->
      val r = tor().request(method, url, body, authToken)
      mapOf(
        "status" to r.status.toInt(),
        "body" to r.body,
        "headers" to r.headers.map { mapOf("name" to it.name, "value" to it.value) },
      )
    }

    AsyncFunction("torShutdown") {
      tor().shutdown()
    }
  }
}
