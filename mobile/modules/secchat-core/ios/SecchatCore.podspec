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

  # Nur die Wrapper-Sources im Phase-3b-Zustand. Die UniFFI-generierten
  # Swift-Dateien + SecchatCore.xcframework werden in Phase 3c hier
  # eingezogen, sobald build.sh durchgelaufen ist. Dann:
  #   s.source_files        += 'Sources/*.{swift,h}'
  #   s.vendored_frameworks = 'SecchatCore.xcframework'
  #   s.preserve_paths      = 'Sources/*.modulemap'
  s.source_files = '*.swift'
end
