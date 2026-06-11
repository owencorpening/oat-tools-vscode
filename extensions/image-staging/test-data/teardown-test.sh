#!/bin/bash
# teardown-test.sh — Clean up ad-hoc test environment

set -e

DOWNLOADS_DIR="$HOME/Downloads"
TEST_REPO_COPY="$HOME/test-repo-oat"

echo "Cleaning up test environment..."
echo ""

# Remove test images
echo "1. Removing test images from $DOWNLOADS_DIR"
rm -f "$DOWNLOADS_DIR/water-droplet-unsplash.png"
rm -f "$DOWNLOADS_DIR/ocean-wave-pexels.png"
rm -f "$DOWNLOADS_DIR/solar-panel-getty.png"
rm -f "$DOWNLOADS_DIR/wind-turbine-shutterstock.png"
rm -f "$DOWNLOADS_DIR/forest-landscape.png"
rm -f "$DOWNLOADS_DIR/ChatGPT Image Jun 10 2026, 03_22_45 PM.png"
echo "   ✓ Removed 6 test images"

# Remove test repo
if [ -d "$TEST_REPO_COPY" ]; then
  echo "2. Removing test repo from $TEST_REPO_COPY"
  rm -rf "$TEST_REPO_COPY"
  echo "   ✓ Removed test repo"
else
  echo "2. Test repo not found (already cleaned up?)"
fi

echo ""
echo "Cleanup complete!"
echo ""
