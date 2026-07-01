#!/bin/bash
# Reset PostgreSQL 18 postgres user password on macOS (EDB installer)
# Run: sudo bash scripts/reset-postgres-password.sh
#
# Default new password: postgres (change NEW_PASSWORD below if you want)

set -e

PGDATA="/Library/PostgreSQL/18/data"
PG_HBA="$PGDATA/pg_hba.conf"
PSQL="/Library/PostgreSQL/18/bin/psql"
PG_CTL="/Library/PostgreSQL/18/bin/pg_ctl"
NEW_PASSWORD="${NEW_PASSWORD:-postgres}"
BACKUP="/tmp/pg_hba.conf.backup.$(date +%s)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo:"
  echo "  sudo bash scripts/reset-postgres-password.sh"
  exit 1
fi

if [ ! -f "$PG_HBA" ]; then
  echo "Error: pg_hba.conf not found at $PG_HBA"
  exit 1
fi

echo "==> Backing up pg_hba.conf to $BACKUP"
cp "$PG_HBA" "$BACKUP"

echo "==> Temporarily allowing local trust authentication..."
# Replace scram/md5 with trust for local TCP and socket connections
sed -i '' \
  -e 's/^\(local[[:space:]]\+all[[:space:]]\+all[[:space:]]\+\)scram-sha-256/\1trust/' \
  -e 's/^\(local[[:space:]]\+all[[:space:]]\+all[[:space:]]\+\)md5/\1trust/' \
  -e 's/^\(host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+127\.0\.0\.1\/32[[:space:]]\+\)scram-sha-256/\1trust/' \
  -e 's/^\(host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+127\.0\.0\.1\/32[[:space:]]\+\)md5/\1trust/' \
  -e 's/^\(host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+::1\/128[[:space:]]\+\)scram-sha-256/\1trust/' \
  -e 's/^\(host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+::1\/128[[:space:]]\+\)md5/\1trust/' \
  "$PG_HBA"

echo "==> Reloading PostgreSQL configuration..."
sudo -u postgres "$PG_CTL" reload -D "$PGDATA"

echo "==> Setting postgres password to: $NEW_PASSWORD"
sudo -u postgres "$PSQL" -h localhost -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_PASSWORD';"

echo "==> Creating isi_climate database (if missing)..."
sudo -u postgres "$PSQL" -h localhost -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'isi_climate'" | grep -q 1 \
  || sudo -u postgres "$PSQL" -h localhost -U postgres -d postgres -c "CREATE DATABASE isi_climate;"

echo "==> Restoring pg_hba.conf from backup..."
cp "$BACKUP" "$PG_HBA"

echo "==> Reloading PostgreSQL configuration again..."
sudo -u postgres "$PG_CTL" reload -D "$PGDATA"

echo ""
echo "Done! Update .env.local with:"
echo "  DATABASE_URL=postgresql://postgres:${NEW_PASSWORD}@localhost:5432/isi_climate"
echo ""
echo "Then restart: npm run dev"
