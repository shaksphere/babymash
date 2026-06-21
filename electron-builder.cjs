// electron-builder configuration.
//
// Signing + notarization turn on automatically when the signing secrets are
// present (CSC_LINK = base64 of the Developer ID Application .p12). Without
// them, the build is produced unsigned — so local/CI builds still work for
// anyone who hasn't set up an Apple Developer cert.
//
// Required env for a signed + notarized build (set as GitHub Actions secrets):
//   CSC_LINK              base64 of your "Developer ID Application" .p12
//   CSC_KEY_PASSWORD      the password used when exporting that .p12
//   APPLE_API_KEY         path to the App Store Connect API key .p8 (CI writes this)
//   APPLE_API_KEY_ID      the API key's Key ID
//   APPLE_API_ISSUER      the API key's Issuer ID (UUID)
//   APPLE_TEAM_ID         your 10-char Apple Developer Team ID

const signed = !!process.env.CSC_LINK;

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'app.babymash.desktop',
  productName: 'BabyMash',
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: ['dist/**', 'electron/**', 'package.json'],
  mac: {
    category: 'public.app-category.entertainment',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    icon: 'build/icon.png',
    ...(signed
      ? {
          hardenedRuntime: true,
          gatekeeperAssess: false,
          entitlements: 'build/entitlements.mac.plist',
          entitlementsInherit: 'build/entitlements.mac.plist',
          // notarytool via App Store Connect API key. teamId comes from env.
          notarize: process.env.APPLE_TEAM_ID
            ? { teamId: process.env.APPLE_TEAM_ID }
            : true,
        }
      : {}),
  },
};
