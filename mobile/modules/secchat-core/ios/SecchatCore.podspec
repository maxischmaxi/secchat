require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'SecchatCore'
  s.version        = package['version']
  s.summary        = package['description']
  s.homepage       = 'https://github.com/maxischmaxi/secchat'
  s.license        = { :type => 'MIT' }
  s.author         = 'secchat'
  s.platforms      = { :ios => '13.0' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift-Sources + UniFFI-generierte Datei aus Sources/.
  # SecchatCore.xcframework wird von build.sh erzeugt (enthaelt
  # libsecchat_core.a fuer Device + Simulator).
  s.source_files       = '*.swift', 'Sources/*.swift', 'Sources/*.h'
  s.vendored_frameworks = 'SecchatCore.xcframework'
  s.preserve_paths     = 'Sources/*.modulemap'
end
