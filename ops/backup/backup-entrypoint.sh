#!/usr/bin/env bash
set -euo pipefail

required_env() {
  local missing=()
  local name
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      missing+=("$name")
    fi
  done

  if (( ${#missing[@]} > 0 )); then
    printf 'Missing required backup env: %s\n' "${missing[*]}" >&2
    exit 78
  fi
}

required_env \
  BACKUP_CRON_SCHEDULE \
  BACKUP_TIMEZONE \
  BACKUP_TMPDIR \
  BACKUP_OBJECT_PREFIX \
  POSTGRES_HOST \
  POSTGRES_PORT \
  POSTGRES_USER \
  POSTGRES_PASSWORD \
  INSTANCE_NAME \
  RUSTFS_ENDPOINT \
  RUSTFS_REGION \
  RUSTFS_BUCKET \
  RUSTFS_ACCESS_KEY_ID \
  RUSTFS_SECRET_ACCESS_KEY \
  RUSTFS_S3_ADDRESSING_STYLE \
  TELEGRAM_API_ORIGIN \
  BACKUP_TELEGRAM_BOT_TOKEN \
  BACKUP_TELEGRAM_CHAT_ID

ln -snf "/usr/share/zoneinfo/${BACKUP_TIMEZONE}" /etc/localtime
printf '%s\n' "${BACKUP_TIMEZONE}" > /etc/timezone

cat > /etc/crontabs/root <<CRON
SHELL=/usr/bin/env bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
TZ=${BACKUP_TIMEZONE}
${BACKUP_CRON_SCHEDULE} /usr/local/bin/postgres-backup-once.sh
CRON

printf 'TaskLabs DB backup scheduler ready: schedule="%s" timezone="%s"\n' \
  "${BACKUP_CRON_SCHEDULE}" \
  "${BACKUP_TIMEZONE}"

exec crond -f -l 8
