#!/bin/bash
# Bundle Size Audit for Zenith UI Revamp
# Run from project root: bash src/renderer/src/lib/bundle-audit.sh

echo "=== Zenith Bundle Size Audit ==="
echo ""

# Build
echo "Building..."
npx pnpm run build 2>&1 | tail -5

echo ""
echo "=== Renderer Bundle Size ==="

# Find renderer output
RENDERER_DIR=$(find out -name "renderer" -type d 2>/dev/null | head -1)
if [ -z "$RENDERER_DIR" ]; then
  RENDERER_DIR="out"
fi

# Total size
echo "Total: $(du -sh "$RENDERER_DIR" 2>/dev/null | cut -f1)"
echo ""

# Top JS chunks
echo "=== Top 10 JS Chunks ==="
find "$RENDERER_DIR" -name "*.js" -exec ls -lh {} \; 2>/dev/null | awk '{print $5, $NF}' | sort -rh | head -10

echo ""
echo "=== Three.js Check ==="
# Verify no three.js in bundle
grep -rl "THREE" "$RENDERER_DIR"/*.js 2>/dev/null && echo "WARNING: THREE references found!" || echo "PASS: No THREE.js references in bundle"
grep -rl "@react-three" "$RENDERER_DIR"/*.js 2>/dev/null && echo "WARNING: @react-three references found!" || echo "PASS: No @react-three references in bundle"

echo ""
echo "=== Dependency Check ==="
# Check if three.js packages are installed
npx pnpm ls three @react-three/fiber @react-three/drei d3-force-3d 2>&1

echo ""
echo "=== Source Import Check ==="
THREE_IMPORTS=$(grep -r "from 'three'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
R3F_IMPORTS=$(grep -r "@react-three" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "three imports: $THREE_IMPORTS"
echo "@react-three imports: $R3F_IMPORTS"

if [ "$THREE_IMPORTS" = "0" ] && [ "$R3F_IMPORTS" = "0" ]; then
  echo "PASS: No three.js or @react-three imports in source code"
else
  echo "WARNING: Found three.js or @react-three imports in source code"
fi

echo ""
echo "=== Expected Savings ==="
echo "Three.js (~600KB), @react-three/fiber (~200KB), @react-three/drei (~300KB), d3-force-3d (~50KB)"
echo "Expected total savings: ~1.1MB+ of JavaScript removed"
