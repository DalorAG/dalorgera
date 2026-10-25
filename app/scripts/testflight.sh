#!/usr/bin/env bash
# Builds a Release archive locally and uploads it to TestFlight, without EAS.
# Signing and upload use the Apple account logged into Xcode (Settings → Accounts).
#
#   npm run testflight                 # build + upload
#   BUILD_NUMBER=42 npm run testflight # explicit build number
#   SKIP_UPLOAD=1 npm run testflight   # archive + export .ipa only
set -euo pipefail

cd "$(dirname "$0")/.."

OUT=build/testflight
# Every upload needs a unique, increasing build number; a timestamp guarantees that.
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"

echo "▸ prebuild (ios/ is generated from app.json)"
# --clean: the Xcode project is named after the app, a renamed app would keep the old one.
npx expo prebuild --platform ios --clean

WORKSPACE=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)
ARCHIVE="$OUT/$SCHEME.xcarchive"

PLIST="ios/$SCHEME/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$PLIST"
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$PLIST")
echo "▸ version $VERSION ($BUILD_NUMBER)"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "▸ archive"
xcodebuild archive \
  -workspace "ios/$SCHEME.xcworkspace" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  | tee "$OUT/archive.log" | grep -E '^(error|warning: .*signing)|\*\* ARCHIVE' || true
[ -d "$ARCHIVE" ] || { echo "✗ archive failed, see $OUT/archive.log"; exit 1; }

OPTIONS=scripts/ExportOptions.plist
if [ -n "${SKIP_UPLOAD:-}" ]; then
  OPTIONS="$OUT/ExportOptions.plist"
  cp scripts/ExportOptions.plist "$OPTIONS"
  /usr/libexec/PlistBuddy -c "Set :destination export" "$OPTIONS"
fi

echo "▸ export${SKIP_UPLOAD:+ (no upload)}"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$OPTIONS" \
  -exportPath "$OUT" \
  -allowProvisioningUpdates

echo "✓ done: $VERSION ($BUILD_NUMBER)"
[ -n "${SKIP_UPLOAD:-}" ] || echo "  the build shows up in App Store Connect → TestFlight after processing (~5–15 min)"
