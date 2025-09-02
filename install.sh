#!/bin/bash

# Firejail Launcher GNOME Extension Installation Script
# 
# Author: Youssef Trii
# Website: https://github.com/nt-edv
# License: GPL-3.0

set -e

EXTENSION_UUID="firejail-launcher@ytrii.local"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"
PROJECT_DIR="$(dirname "$0")"

echo "🚀 Installing Firejail Launcher GNOME Extension..."

# Check if firejail is installed
if ! command -v firejail &> /dev/null; then
    echo "❌ Error: Firejail not found!"
    echo "Please install firejail first: sudo dnf install firejail"
    exit 1
fi

echo "✅ Firejail found: $(firejail --version | head -1)"

# Create extension directory
echo "📁 Creating extension directory..."
mkdir -p "$EXTENSION_DIR"
mkdir -p "$EXTENSION_DIR/schemas"

# Copy extension files
echo "📋 Copying extension files..."
cp "$PROJECT_DIR/metadata.json" "$EXTENSION_DIR/"
cp "$PROJECT_DIR/extension.js" "$EXTENSION_DIR/"
cp "$PROJECT_DIR/prefs.js" "$EXTENSION_DIR/"
cp "$PROJECT_DIR/stylesheet.css" "$EXTENSION_DIR/"
cp "$PROJECT_DIR/schemas/"*.xml "$EXTENSION_DIR/schemas/"

# Compile schemas
echo "🔧 Compiling GSettings schemas..."
glib-compile-schemas "$EXTENSION_DIR/schemas/"

# Check GNOME Shell version
GNOME_VERSION=$(gnome-shell --version | grep -oE '[0-9]+' | head -1)
echo "🐚 GNOME Shell version: $GNOME_VERSION"

if [[ $GNOME_VERSION -lt 45 ]]; then
    echo "⚠️  Warning: This extension requires GNOME Shell 45 or later"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Restart GNOME Shell:"
if [[ "$XDG_SESSION_TYPE" == "x11" ]]; then
    echo "   - Press Alt+F2, type 'r', press Enter"
else
    echo "   - Log out and log back in (Wayland)"
fi
echo "2. Enable the extension:"
echo "   - Open GNOME Extensions app"
echo "   - Find 'Firejail Launcher' and toggle it on"
echo "3. Configure settings:"
echo "   - Click the gear icon next to the extension"
echo ""
echo "🔒 The extension will add a security icon to your top panel when active."
