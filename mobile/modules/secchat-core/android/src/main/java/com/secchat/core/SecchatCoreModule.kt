package com.secchat.core

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Phase-3b-Stub. Die echten UniFFI-Kotlin-Bindings leben unter
 * `android/src/main/java/uniffi/secchat_core/` und werden von
 * `native/secchat-core/build.sh` erzeugt. Solange die noch nicht
 * da sind, wirft jeder Aufruf einen klaren Fehler — so bleibt die
 * Kompilierung gruen, JS-seitige Use-Versuche schlagen aber laut
 * fehl statt still falsche Werte zu liefern.
 *
 * Phase 3c ersetzt diesen Stub durch den echten Wrapper, der
 * `uniffi.secchat_core.MlsClient`/`TorClient`/... anruft.
 */
class SecchatCoreModule : Module() {
  private fun <T> notReady(): T = throw IllegalStateException(
    "secchat-core native bindings not generated yet — " +
      "run native/secchat-core/build.sh first."
  )

  override fun definition() = ModuleDefinition {
    Name("SecchatCore")

    // identity
    Function("deriveHandle") { _: ByteArray -> notReady<String>() }
    Function("deriveIdentityPrivateKey") { _: ByteArray -> notReady<ByteArray>() }

    // MLS
    Function("initMls") { _: ByteArray -> notReady<Unit>() }
    AsyncFunction("generateKeyPackages") { _: Int -> notReady<List<ByteArray>>() }
    AsyncFunction("createGroup") { _: String -> notReady<Map<String, Any>>() }
    AsyncFunction("inviteMembers") {
      _: Map<String, Any?>, _: List<ByteArray> -> notReady<Map<String, Any>>()
    }
    AsyncFunction("processWelcome") { _: ByteArray -> notReady<Map<String, Any>>() }
    AsyncFunction("processCommit") {
      _: Map<String, Any?>, _: ByteArray -> notReady<Map<String, Any>>()
    }
    AsyncFunction("encryptMessage") {
      _: Map<String, Any?>, _: ByteArray -> notReady<ByteArray>()
    }
    AsyncFunction("decryptMessage") {
      _: Map<String, Any?>, _: ByteArray -> notReady<ByteArray>()
    }

    // Tor
    Function("torInit") { notReady<Unit>() }
    AsyncFunction("torBootstrap") { notReady<Unit>() }
    AsyncFunction("torRequest") {
      _: String, _: String, _: ByteArray?, _: String? -> notReady<Map<String, Any>>()
    }
    AsyncFunction("torShutdown") { notReady<Unit>() }
  }
}
