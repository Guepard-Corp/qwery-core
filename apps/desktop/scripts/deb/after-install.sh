#!/bin/bash
set -euo pipefail

APP_DIR="/opt/QweryStudio"
EXEC_PATH="${APP_DIR}/qwery-desktop"
BIN_LINK="/usr/bin/qwery-studio"
SANDBOX_PATH="${APP_DIR}/chrome-sandbox"
DESKTOP_SRC="${APP_DIR}/resources/linux/qwery-studio.desktop"
DESKTOP_DEST="/usr/share/applications/qwery-studio.desktop"
ICON_SRC="${APP_DIR}/resources/icons/icon.png"
ICON_DEST="/usr/share/icons/hicolor/512x512/apps/qwery-studio.png"

if [ -f "$SANDBOX_PATH" ]; then
  chown root:root "$SANDBOX_PATH"
  chmod 4755 "$SANDBOX_PATH"
else
  echo "chrome-sandbox not found at $SANDBOX_PATH" >&2
fi

if [ -f "$EXEC_PATH" ]; then
  ln -sf "$EXEC_PATH" "$BIN_LINK"
else
  echo "Executable not found at $EXEC_PATH" >&2
fi

# Remove any auto-generated desktop entries from electron-builder
rm -f /usr/share/applications/qwery-desktop.desktop

if [ -f "$DESKTOP_SRC" ]; then
  install -Dm644 "$DESKTOP_SRC" "$DESKTOP_DEST"
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database >/dev/null 2>&1 || true
  fi
else
  echo "Desktop entry not found at $DESKTOP_SRC" >&2
fi

if [ -f "$ICON_SRC" ]; then
  # Install icon in multiple sizes for better compatibility
  # Using $$ to escape $ for electron-builder macro processing
  for icon_size in 16 22 24 32 48 64 128 256 512 scalable; do
    if [ "$icon_size" = "scalable" ]; then
      # For scalable, use the 512x512 icon (or create symlink)
      install -Dm644 "$ICON_SRC" "/usr/share/icons/hicolor/scalable/apps/qwery-studio.png"
    else
      install -Dm644 "$ICON_SRC" "/usr/share/icons/hicolor/$${icon_size}x$${icon_size}/apps/qwery-studio.png"
    fi
  done
  if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q /usr/share/icons/hicolor || true
  fi
else
  echo "Icon not found at $ICON_SRC" >&2
fi

