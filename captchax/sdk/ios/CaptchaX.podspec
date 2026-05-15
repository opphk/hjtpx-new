Pod::Spec.new do |s|
  s.name             = 'CaptchaX'
  s.version          = '1.0.0'
  s.summary          = 'CaptchaX iOS SDK - Modern Captcha Verification'
  s.description      = <<-DESC
    CaptchaX iOS SDK provides modern captcha verification solutions for iOS applications.
    Supports multiple captcha types: slider, click, rotate, puzzle, text, and icon verification.
    Fully compatible with Swift and Objective-C.
    Swift 6 supported with async/await, Actor isolation, and Sendable protocol.
  DESC

  s.homepage         = 'https://github.com/opphk/hjtpx'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'CaptchaX' => 'captchax@example.com' }
  s.source           = { :git => 'https://github.com/opphk/hjtpx.git', :tag => s.version.to_s }
  s.platform         = :ios, '15.0'
  s.source_files     = 'Sources/**/*.swift'
  s.public_header_files = 'Sources/**/*.h'
  s.swift_version    = '6.0'
  s.frameworks       = 'UIKit', 'WebKit', 'SwiftUI'

  s.dependency 'SnapKit', '~> 5.7'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_OBJC_BRIDGING_HEADER' => 'Sources/CaptchaXObjC/CaptchaX-Bridging-Header.h',
    'SWIFT_VERSION' => '6.0',
    'ENABLE_EXPERIMENTAL_FEATURES' => 'StrictConcurrency'
  }

  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '-ObjC'
  }
end
