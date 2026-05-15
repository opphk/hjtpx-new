// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "CaptchaX",
    defaultRole: .consumer,
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "CaptchaX",
            targets: ["CaptchaX"]
        ),
        .library(
            name: "CaptchaXObjC",
            targets: ["CaptchaXObjC"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/SnapKit/SnapKit.git", from: "5.7.0")
    ],
    targets: [
        .target(
            name: "CaptchaX",
            dependencies: [
                .product(name: "SnapKit", package: "SnapKit")
            ],
            path: "Sources/CaptchaX",
            publicHeadersPath: "../CaptchaXObjC",
            swiftSettings: [
                .swiftVersion(.v6),
                .enableExperimentalFeature("StrictConcurrency"),
                .enableExperimentalFeature("TypedThrows")
            ]
        ),
        .target(
            name: "CaptchaXObjC",
            dependencies: [
                "CaptchaX",
                .product(name: "SnapKit", package: "SnapKit")
            ],
            path: "Sources/CaptchaXObjC",
            swiftSettings: [
                .swiftVersion(.v6),
                .enableExperimentalFeature("StrictConcurrency"),
                .enableExperimentalFeature("TypedThrows")
            ]
        )
    ]
)
