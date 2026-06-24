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

notify_telegram() {
  local message="$1"
  curl -fsS \
    -X POST "${TELEGRAM_API_ORIGIN}/bot${BACKUP_TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${BACKUP_TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" \
    >/dev/null
}

required_env \
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

timestamp="$(TZ="${BACKUP_TIMEZONE}" date '+%Y%m%dT%H%M%S%z')"
safe_instance="$(printf '%s' "${INSTANCE_NAME}" | tr -c 'A-Za-z0-9_.-' '_')"
backup_dir="${BACKUP_TMPDIR%/}"
backup_file="${backup_dir}/${safe_instance}_${timestamp}.dump"
object_prefix="${BACKUP_OBJECT_PREFIX#/}"
object_prefix="${object_prefix%/}"
object_key="${object_prefix}/${safe_instance}/${safe_instance}_${timestamp}.dump"

mkdir -p "${backup_dir}"
cleanup() {
  rm -f "${backup_file}"
}
trap cleanup EXIT

printf 'Starting TaskLabs DB backup for database "%s"\n' "${INSTANCE_NAME}"

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  --host "${POSTGRES_HOST}" \
  --port "${POSTGRES_PORT}" \
  --username "${POSTGRES_USER}" \
  --dbname "${INSTANCE_NAME}" \
  --format custom \
  --file "${backup_file}"

backup_bytes="$(wc -c < "${backup_file}" | tr -d '[:space:]')"

export AWS_ACCESS_KEY_ID="${RUSTFS_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${RUSTFS_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${RUSTFS_REGION}"
export AWS_EC2_METADATA_DISABLED=true

aws configure set default.s3.addressing_style "${RUSTFS_S3_ADDRESSING_STYLE}" >/dev/null

if ! aws --endpoint-url "${RUSTFS_ENDPOINT}" s3api head-bucket --bucket "${RUSTFS_BUCKET}" >/dev/null 2>&1; then
  aws --endpoint-url "${RUSTFS_ENDPOINT}" s3 mb "s3://${RUSTFS_BUCKET}" >/dev/null
fi

aws --endpoint-url "${RUSTFS_ENDPOINT}" \
  s3 cp "${backup_file}" "s3://${RUSTFS_BUCKET}/${object_key}" \
  --only-show-errors

notify_telegram "TaskLabs DB backup complete
Database: ${INSTANCE_NAME}
Bucket: ${RUSTFS_BUCKET}
Object: ${object_key}
Size: ${backup_bytes} bytes
Time: ${timestamp}"

printf 'TaskLabs DB backup complete: s3://%s/%s (%s bytes)\n' \
  "${RUSTFS_BUCKET}" \
  "${object_key}" \
  "${backup_bytes}"
