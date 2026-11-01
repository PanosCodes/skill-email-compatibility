#!/usr/bin/env bash
# Empty Mailpit, then run MAIL_SEND_CMD to deliver one of every email.
set -euo pipefail
base="${MAILPIT_URL:-http://localhost:8025}"
: "${MAIL_SEND_CMD:?set MAIL_SEND_CMD to a command that delivers every email to Mailpit}"
curl -s -X DELETE "$base/api/v1/messages" > /dev/null
bash -c "$MAIL_SEND_CMD"
