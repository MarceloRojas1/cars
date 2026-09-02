#!/bin/sh
# Arranque de la imagen de demostración: levanta Postgres dentro del mismo
# contenedor, aplica migraciones y semilla, y recién ahí arranca la aplicación.
# Solo para pruebas — ver el comentario del stage `demo` en el Dockerfile.
set -e

PGDATA=/var/lib/postgresql/data
export PGDATA

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "→ inicializando Postgres…"
  initdb -U postgres -E UTF8 --locale=C > /dev/null

  pg_ctl -w -o "-c listen_addresses='' -c unix_socket_directories=/run/postgresql" start > /dev/null

  echo "→ creando base y roles…"
  psql -U postgres -q -c "create database velie;"
  psql -U postgres -q -c "create role velie login superuser password 'velie';"
  psql -U postgres -d velie -q -f /app/db/00-auth-shim.sql

  echo "→ aplicando migraciones…"
  for m in /app/db/migrations/*.sql; do
    echo "   $(basename "$m")"
    psql -U postgres -d velie -q -v ON_ERROR_STOP=1 -f "$m"
  done

  psql -U postgres -d velie -q -v ON_ERROR_STOP=1 -f /app/db/06-rol-app.sql

  echo "→ cargando datos de ejemplo…"
  psql -U velie_app -d velie -h /run/postgresql -q -v ON_ERROR_STOP=1 -f /app/db/seed.sql \
    || psql -U postgres -d velie -q -v ON_ERROR_STOP=1 -f /app/db/seed.sql

  pg_ctl -w stop > /dev/null
  echo "→ base lista"
fi

pg_ctl -w -o "-c listen_addresses='127.0.0.1' -c unix_socket_directories=/run/postgresql" start > /dev/null
echo "→ Postgres arriba"

export DATABASE_URL="postgres://velie_app:velie_app@127.0.0.1:5432/velie"
exec node server.js
