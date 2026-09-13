#!/bin/bash
# Install the weekly ingest and the daily health check as launchd jobs.
#
# They run on this Mac rather than on the server for one reason: the pipeline
# authenticates as the owner's personal Telegram account (ishtop.session). That
# file is a key to their Telegram, and putting it on a server to save them
# opening a laptop is a bad trade. launchd runs a missed job once the machine
# wakes, so a closed lid delays the run, it does not skip it.
#
#   ./install_schedule.sh          install (or refresh) both jobs
#   ./install_schedule.sh remove   uninstall
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
INGEST="$REPO/backend/scripts/ingest"
LA="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs/ishtop"
PY="$(command -v python3)"

if [[ "${1:-}" == "remove" ]]; then
  for n in weekly health; do
    launchctl bootout "gui/$(id -u)/uz.ishtop.$n" 2>/dev/null || true
    rm -f "$LA/uz.ishtop.$n.plist"
  done
  echo "o'chirildi"
  exit 0
fi

# The secrets stay out of the plists: the DSN and api_hash are read at run time
# from a file only the owner can read.
ENVFILE="$HOME/.ishtop.env"
if [[ ! -f "$ENVFILE" ]]; then
  cat > "$ENVFILE" <<'EOF'
# IshTop scheduled jobs read these. Keep this file private (chmod 600).
export ISHTOP_DSN=""        # railway variables -s ishtop-db --json -> DATABASE_PUBLIC_URL
export TG_API_HASH=""       # the Telethon api_hash
EOF
  chmod 600 "$ENVFILE"
  echo "⚠️  $ENVFILE yaratildi — ichiga DSN va TG_API_HASH yozing, keyin qayta ishga tushiring"
  exit 1
fi
# shellcheck disable=SC1090
source "$ENVFILE"
[[ -n "${ISHTOP_DSN:-}" && -n "${TG_API_HASH:-}" ]] || {
  echo "⚠️  $ENVFILE to'ldirilmagan"; exit 1; }

mkdir -p "$LA" "$LOGS"

plist() {  # name, script, extra-args, weekday|"", hour
  local name="$1" script="$2" extra="$3" weekday="$4" hour="$5"
  cat > "$LA/uz.ishtop.$name.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>uz.ishtop.$name</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string><string>-lc</string>
    <string>source "$ENVFILE" &amp;&amp; cd "$INGEST" &amp;&amp; "$PY" $script "\$ISHTOP_DSN" "\$TG_API_HASH" $extra</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    $( [[ -n "$weekday" ]] && echo "<key>Weekday</key><integer>$weekday</integer>" )
    <key>Hour</key><integer>$hour</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>$LOGS/$name.log</string>
  <key>StandardErrorPath</key><string>$LOGS/$name.log</string>
  <key>RunAtLoad</key><false/>
</dict></plist>
EOF
  launchctl bootout "gui/$(id -u)/uz.ishtop.$name" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$LA/uz.ishtop.$name.plist"
}

# Sunday 20:00 — the new week's listings are up, and a failure leaves Monday to fix it.
plist weekly weekly.py "--commit" 0 20
# Every day at 09:00; it only messages when something is actually wrong.
plist health healthcheck.py "--notify" "" 9

echo "o'rnatildi:"
echo "  yakshanba 20:00  weekly.py --commit   (yig'im + hisobot)"
echo "  har kuni 09:00   healthcheck.py       (muammo bo'lsagina xabar)"
echo "  log: $LOGS"
echo
echo "hozir sinab ko'rish:  launchctl kickstart gui/$(id -u)/uz.ishtop.health"
