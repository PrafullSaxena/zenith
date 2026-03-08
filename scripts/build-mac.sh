#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
#  Zenith — macOS Build Script
#
#  Builds Zenith.app as a .dmg installer for macOS.
#  Handles ad-hoc code signing so the app runs on macOS
#  Sequoia+ without a paid Apple Developer certificate.
#
#  Usage:
#    ./scripts/build-mac.sh            # build for current arch (arm64 or x64)
#    ./scripts/build-mac.sh --arm64    # build for Apple Silicon only
#    ./scripts/build-mac.sh --x64      # build for Intel only
#    ./scripts/build-mac.sh --universal # build Universal binary (arm64 + x64)
# ─────────────────────────────────────────────────────────────

APP_NAME="Zenith"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Parse arguments ──────────────────────────────────────────
ARCH=""
case "${1:-}" in
  --arm64)    ARCH="--arm64" ;;
  --x64)      ARCH="--x64" ;;
  --universal) ARCH="--universal" ;;
  --help|-h)
    echo "Usage: $0 [--arm64|--x64|--universal]"
    echo ""
    echo "  --arm64      Build for Apple Silicon (M1/M2/M3/M4)"
    echo "  --x64        Build for Intel Macs"
    echo "  --universal  Build Universal binary (both architectures)"
    echo "  (no flag)    Build for current machine's architecture"
    exit 0
    ;;
  "") ;;
  *) error "Unknown option: $1. Use --help for usage." ;;
esac

cd "$PROJECT_DIR"

# ── Step 1: Preflight checks ────────────────────────────────
info "Running preflight checks..."

command -v node  >/dev/null 2>&1 || error "Node.js is not installed. Install it from https://nodejs.org"
command -v npm   >/dev/null 2>&1 || error "npm is not installed."

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 18+ is required (found v$(node -v))"
fi

ok "Node $(node -v)  npm $(npm -v)"

# ── Step 2: Install dependencies ─────────────────────────────
if [ ! -d "node_modules" ]; then
  info "Installing dependencies..."
  npm install
  ok "Dependencies installed"
else
  ok "node_modules present"
fi

# ── Step 3: Build renderer + main + preload ──────────────────
info "Building application (electron-vite build)..."
npm run build
ok "Application built successfully"

# ── Step 4: Package with electron-builder ────────────────────
info "Packaging ${APP_NAME}.app for macOS${ARCH:+ ($ARCH)}..."
npx electron-builder --mac $ARCH
ok "Packaging complete"

# ── Step 5: Ad-hoc code signing ──────────────────────────────
# macOS Sequoia+ requires all binaries in the .app bundle to
# share a consistent code signature. electron-builder with
# identity:null skips signing, so we ad-hoc sign everything
# with a single consistent identity and remove quarantine.
info "Signing app bundle (ad-hoc)..."

# Find the .app bundle(s)
APP_FOUND=0
for app_dir in "$DIST_DIR"/mac-arm64 "$DIST_DIR"/mac-x64 "$DIST_DIR"/mac "$DIST_DIR"/mac-universal; do
  APP_PATH="$app_dir/${APP_NAME}.app"
  if [ -d "$APP_PATH" ]; then
    APP_FOUND=1

    # Remove quarantine attribute (Gatekeeper)
    xattr -cr "$APP_PATH" 2>/dev/null || true

    # Ad-hoc sign the entire bundle with consistent identity
    codesign --force --deep --sign - "$APP_PATH" 2>/dev/null
    ok "Signed: $APP_PATH"

    # Verify the signature
    if codesign --verify --deep --strict "$APP_PATH" 2>/dev/null; then
      ok "Signature verified"
    else
      warn "Signature verification had warnings (app should still work)"
    fi
  fi
done

if [ "$APP_FOUND" -eq 0 ]; then
  warn "No .app bundle found to sign — check build output above"
fi

# ── Step 6: Show output ──────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ ${APP_NAME} build complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""

# List the built artifacts
info "Build artifacts in ${DIST_DIR}:"
echo ""
if [ -d "$DIST_DIR" ]; then
  # Show .dmg files
  find "$DIST_DIR" -maxdepth 1 -name "*.dmg" -exec ls -lh {} \; 2>/dev/null | while read line; do
    echo -e "  ${CYAN}DMG:${NC}  $line"
  done
  # Show .app directories
  find "$DIST_DIR" -maxdepth 2 -name "*.app" -type d 2>/dev/null | while read app; do
    SIZE=$(du -sh "$app" 2>/dev/null | cut -f1)
    echo -e "  ${CYAN}APP:${NC}  $app  ($SIZE)"
  done
  # Show .zip files
  find "$DIST_DIR" -maxdepth 1 -name "*.zip" -exec ls -lh {} \; 2>/dev/null | while read line; do
    echo -e "  ${CYAN}ZIP:${NC}  $line"
  done
else
  warn "dist/ directory not found — check for errors above"
fi

echo ""
info "To install:"
info "  1. Open the .dmg and drag ${APP_NAME} to Applications"
info "  2. If macOS blocks the app: System Settings > Privacy & Security > Open Anyway"
info ""
info "Or run directly from the build:"
info "  open \"$DIST_DIR/mac-arm64/${APP_NAME}.app\""
