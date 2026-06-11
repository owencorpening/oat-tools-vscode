#!/bin/bash
# setup-test.sh — Set up ad-hoc test environment for image-staging extension

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEST_DATA_DIR="$SCRIPT_DIR"
TEST_IMAGES_DIR="$TEST_DATA_DIR/downloads"
TEST_REPO_DIR="$TEST_DATA_DIR/repo"

DOWNLOADS_DIR="$HOME/Downloads"
TEST_REPO_COPY="$HOME/test-repo-oat"

echo "Setting up test environment..."
echo ""

# Copy test images to Downloads
echo "1. Copying test images to $DOWNLOADS_DIR"
cp "$TEST_IMAGES_DIR"/*.png "$DOWNLOADS_DIR/"
echo "   ✓ Copied 6 test images"

# Copy test repo
echo "2. Copying test repo to $TEST_REPO_COPY"
cp -r "$TEST_REPO_DIR" "$TEST_REPO_COPY"
echo "   ✓ Copied repo structure"

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open VSCode with the test repo:"
echo "     code $TEST_REPO_COPY"
echo ""
echo "  2. When done testing, run teardown:"
echo "     extensions/image-staging/test-data/teardown-test.sh"
echo ""
