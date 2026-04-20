#!/usr/bin/env bash
# Cross-compile secchat-core fuer iOS + Android und generiert die
# UniFFI-Bindings. Ausgabe landet direkt im Expo-Modul-Ordner unter
# mobile/modules/secchat-core/.
#
# Voraussetzungen (einmalig):
#   rustup target add aarch64-linux-android armv7-linux-androideabi \
#                      x86_64-linux-android i686-linux-android
#   rustup target add aarch64-apple-ios aarch64-apple-ios-sim \
#                      x86_64-apple-ios
#   cargo install cargo-ndk
#   Android NDK (ANDROID_NDK_HOME setzen)
#   macOS + Xcode fuer den iOS-Teil (wird auf Linux uebersprungen)
set -euo pipefail

CRATE_DIR="$(cd "$(dirname "$0")" && pwd)"
MODULE_DIR="$(cd "$CRATE_DIR/../../mobile/modules/secchat-core" && pwd)"
LIB="secchat_core"

echo "[+] Android: cross-compile aarch64/armv7/x86_64"
cd "$CRATE_DIR"
cargo ndk \
  -t aarch64-linux-android \
  -t armv7-linux-androideabi \
  -t x86_64-linux-android \
  -o "$MODULE_DIR/android/src/main/jniLibs" \
  build --release

echo "[+] Android: Kotlin-Bindings generieren"
cargo run --bin uniffi-bindgen -- generate \
  --library "target/aarch64-linux-android/release/lib${LIB}.so" \
  --language kotlin \
  --out-dir "$MODULE_DIR/android/src/main/java/"

if [[ "$(uname -s)" == "Darwin" ]]; then
  echo "[+] iOS: cross-compile device + simulator"
  cargo build --release --target aarch64-apple-ios
  cargo build --release --target aarch64-apple-ios-sim
  cargo build --release --target x86_64-apple-ios

  echo "[+] iOS: Simulator-lipo + xcframework"
  SIM_DIR="$CRATE_DIR/target/ios-sim-universal/release"
  mkdir -p "$SIM_DIR"
  lipo -create \
    "target/aarch64-apple-ios-sim/release/lib${LIB}.a" \
    "target/x86_64-apple-ios/release/lib${LIB}.a" \
    -output "$SIM_DIR/lib${LIB}.a"

  rm -rf "$MODULE_DIR/ios/SecchatCore.xcframework"
  xcodebuild -create-xcframework \
    -library "target/aarch64-apple-ios/release/lib${LIB}.a" \
    -library "$SIM_DIR/lib${LIB}.a" \
    -output "$MODULE_DIR/ios/SecchatCore.xcframework"

  echo "[+] iOS: Swift-Bindings generieren"
  mkdir -p "$MODULE_DIR/ios/Sources"
  cargo run --bin uniffi-bindgen -- generate \
    --library "target/aarch64-apple-ios/release/lib${LIB}.a" \
    --language swift \
    --out-dir "$MODULE_DIR/ios/Sources/"
else
  echo "[!] iOS-Targets uebersprungen — nur auf macOS baubar."
fi

echo "[OK] native libs + bindings fertig unter $MODULE_DIR"
