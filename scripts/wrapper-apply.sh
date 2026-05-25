# shellcheck shell=bash
# Applies any staged, verified update before the app launches (ADR #37).
#
# The in-app UpdateChecker downloads new releases into `$root/staged/<artifact>/`
# and writes a `.ready` marker last; this function — run by the bin/qwery wrapper
# before it execs the binary — swaps them into place. It is the only safe moment
# to replace the binary, since qwery cannot hot-swap its own running code.
#
# Every step is best-effort and self-restoring: a partial swap never leaves the
# install broken, and any failure must not block the boot (callers guard with
# `( qwery_apply_staged_updates "$root" ) || true`).
qwery_apply_staged_updates() {
  local root="$1"
  local staged="$root/staged"

  # --- qwery self-update: atomic swap of the lib/ directory ---
  if [ -f "$staged/qwery/.ready" ] && [ -d "$staged/qwery/lib" ]; then
    if mv "$staged/qwery/lib" "$root/lib.new" 2>/dev/null; then
      rm -rf "$root/lib.old"
      if mv "$root/lib" "$root/lib.old" 2>/dev/null && mv "$root/lib.new" "$root/lib" 2>/dev/null; then
        [ -f "$staged/qwery/version" ] && cp "$staged/qwery/version" "$root/version" 2>/dev/null
        rm -rf "$root/lib.old"
      else
        # Half-completed swap: restore the previous lib if it went missing.
        [ -d "$root/lib" ] || mv "$root/lib.old" "$root/lib" 2>/dev/null
        rm -rf "$root/lib.new"
      fi
    fi
    rm -rf "$staged/qwery"
  fi

  # --- gfs update: replace the binary in place when its location is writable ---
  if [ -f "$staged/gfs/.ready" ] && [ -f "$staged/gfs/gfs" ]; then
    local gfs_bin
    gfs_bin="$(command -v gfs 2>/dev/null || true)"
    [ -n "$gfs_bin" ] || gfs_bin="$HOME/.gfs/bin/gfs"
    if [ -w "$gfs_bin" ] || { [ ! -e "$gfs_bin" ] && [ -w "$(dirname "$gfs_bin")" ]; }; then
      chmod +x "$staged/gfs/gfs" 2>/dev/null || true
      mv "$staged/gfs/gfs" "$gfs_bin" 2>/dev/null && rm -rf "$staged/gfs"
    fi
    # Not writable (e.g. gfs under /usr/local/bin): leave it staged; the app
    # surfaces a hint to re-run the GFS installer manually.
  fi
}
