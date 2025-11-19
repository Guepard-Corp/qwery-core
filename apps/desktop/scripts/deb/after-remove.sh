#!/bin/bash
set -euo pipefail

APP_DIR="/opt/QweryStudio"
BIN_LINK="/usr/bin/qwery-studio"
SANDBOX_PATH="${APP_DIR}/chrome-sandbox"
DESKTOP_DEST="/usr/share/applications/qwery-studio.desktop"
# Also remove auto-generated desktop entry if it exists
DESKTOP_DEST_AUTO="/usr/share/applications/qwery-desktop.desktop"

if [ -f "$SANDBOX_PATH" ]; then
  chmod 4755 "$SANDBOX_PATH"
fi

if [ -L "$BIN_LINK" ] || [ -f "$BIN_LINK" ]; then
  rm -f "$BIN_LINK"
fi

if [ -f "$DESKTOP_DEST" ]; then
  rm -f "$DESKTOP_DEST"
fi

if [ -f "$DESKTOP_DEST_AUTO" ]; then
  rm -f "$DESKTOP_DEST_AUTO"
fi

if [ -f "$DESKTOP_DEST" ] || [ -f "$DESKTOP_DEST_AUTO" ]; then
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database >/dev/null 2>&1 || true
  fi
fi

# Remove icons from all size directories
# Using $$ to escape $ for electron-builder macro processing
for icon_size in 16 22 24 32 48 64 128 256 512 scalable; do
  if [ "$icon_size" = "scalable" ]; then
    rm -f "/usr/share/icons/hicolor/scalable/apps/qwery-studio.png"
  else
    rm -f "/usr/share/icons/hicolor/$${icon_size}x$${icon_size}/apps/qwery-studio.png"
  fi
done
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor || true
fi

