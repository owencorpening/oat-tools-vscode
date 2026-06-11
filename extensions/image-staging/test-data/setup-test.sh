#!/bin/bash
# setup-test.sh — Set up ad-hoc test environment and open VSCode
#
# Cleans up any old test data, copies fresh test files, and launches VSCode
# with the test repo ready to use.

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEST_DATA_DIR="$SCRIPT_DIR"
TEST_IMAGES_DIR="$TEST_DATA_DIR/downloads"
TEST_REPO_DIR="$TEST_DATA_DIR/repo"

DOWNLOADS_DIR="$HOME/Downloads"
TEST_REPO_COPY="$HOME/test-repo-oat"

echo "Setting up ad-hoc test environment..."
echo ""

# 1. Cleanup old test data
echo "1. Cleaning up old test data..."
rm -f "$DOWNLOADS_DIR/water-droplet-unsplash.png"
rm -f "$DOWNLOADS_DIR/ocean-wave-pexels.png"
rm -f "$DOWNLOADS_DIR/solar-panel-getty.png"
rm -f "$DOWNLOADS_DIR/wind-turbine-shutterstock.png"
rm -f "$DOWNLOADS_DIR/forest-landscape.png"
rm -f "$DOWNLOADS_DIR/ChatGPT Image Jun 10 2026, 03_22_45 PM.png"
if [ -d "$TEST_REPO_COPY" ]; then
  rm -rf "$TEST_REPO_COPY"
fi
echo "   ✓ Old test data removed"

# 2. Copy fresh test images
echo "2. Copying fresh test images to $DOWNLOADS_DIR"
cp "$TEST_IMAGES_DIR"/*.png "$DOWNLOADS_DIR/"
echo "   ✓ Copied 6 test images"

# 3. Copy fresh test repo
echo "3. Copying fresh test repo to $TEST_REPO_COPY"
cp -r "$TEST_REPO_DIR" "$TEST_REPO_COPY"
echo "   ✓ Copied repo structure"

# 4. Create .vscode settings to disable ledger API for this test repo
# (so extension uses local Downloads search instead of remote ledger)
echo "4. Configuring VSCode workspace"
mkdir -p "$TEST_REPO_COPY/.vscode"
cat > "$TEST_REPO_COPY/.vscode/settings.json" << EOF
{
  "oatImages.ledgerApiUrl": "",
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
EOF
echo "   ✓ Created workspace settings"

echo ""
echo "✓ Setup complete! Opening VSCode..."
echo ""

# Launch VSCode
code "$TEST_REPO_COPY"

echo ""
echo "When done testing, run:"
echo "  extensions/image-staging/test-data/teardown-test.sh"
echo ""
