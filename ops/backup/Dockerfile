# syntax=docker/dockerfile:1.7
FROM postgres:17-alpine

RUN apk add --no-cache aws-cli bash ca-certificates curl tzdata

COPY ops/backup/backup-entrypoint.sh /usr/local/bin/backup-entrypoint.sh
COPY ops/backup/backup-healthcheck.sh /usr/local/bin/backup-healthcheck.sh
COPY ops/backup/postgres-backup-once.sh /usr/local/bin/postgres-backup-once.sh
RUN chmod 0755 /usr/local/bin/backup-entrypoint.sh /usr/local/bin/backup-healthcheck.sh /usr/local/bin/postgres-backup-once.sh

ENTRYPOINT ["/usr/local/bin/backup-entrypoint.sh"]
