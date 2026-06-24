#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RUSTFS_ENDPOINT:-}" ]]; then
  echo "RUSTFS_ENDPOINT is required" >&2
  exit 1
fi

if ! ps | grep -q '[c]rond'; then
  echo "crond is not running" >&2
  exit 1
fi

if [[ -n "${RUSTFS_BUCKET:-}" &&
      -n "${RUSTFS_ACCESS_KEY_ID:-}" &&
      -n "${RUSTFS_SECRET_ACCESS_KEY:-}" &&
      -n "${RUSTFS_REGION:-}" ]]; then
  export AWS_ACCESS_KEY_ID="${RUSTFS_ACCESS_KEY_ID}"
  export AWS_SECRET_ACCESS_KEY="${RUSTFS_SECRET_ACCESS_KEY}"
  export AWS_DEFAULT_REGION="${RUSTFS_REGION}"
  export AWS_EC2_METADATA_DISABLED=true

  aws configure set default.s3.addressing_style "${RUSTFS_S3_ADDRESSING_STYLE:-path}" >/dev/null

  if aws --endpoint-url "${RUSTFS_ENDPOINT}" \
    s3api head-bucket \
    --bucket "${RUSTFS_BUCKET}" \
    >/dev/null 2>&1; then
    exit 0
  fi
fi

status="$(
  curl -sS -o /dev/null \
    -w '%{http_code}' \
    --connect-timeout 5 \
    --max-time 10 \
    "${RUSTFS_ENDPOINT}" || true
)"

case "${status}" in
  2*|3*|4*) exit 0 ;;
  *)
    echo "RustFS endpoint did not respond successfully enough for healthcheck: ${status:-none}" >&2
    exit 1
    ;;
esac
