#!/usr/bin/env bash
# Aplica no Supabase as migracoes de server/migrations que ainda nao correram (usado pela GitHub Action Deploy).
# Cada ficheiro corre numa transacao, junto com o registo em gog.migrations: ou entra tudo, ou nada.
# Uso: DB="<endereco da base de dados>" bash tools/migrate.sh
set -euo pipefail
PSQL="${PSQL:-psql}"
run() { "$PSQL" "$DB" -v ON_ERROR_STOP=1 -q -X "$@"; }
run -c "create table if not exists gog.migrations (name text primary key, at timestamptz not null default now()); alter table gog.migrations enable row level security; revoke all on gog.migrations from public;"
for f in $(ls server/migrations/*.sql | sort); do
  n="$(basename "$f")"
  if ! [[ "$n" =~ ^[0-9]{3}-[a-z0-9-]+\.sql$ ]]; then echo "Nome de migracao invalido: $n (usa 001-nome.sql)"; exit 1; fi
  if [ -n "$(run -tA -c "select 1 from gog.migrations where name = '$n'")" ]; then echo "ja aplicada: $n"; continue; fi
  echo "a aplicar: $n"
  { echo 'begin;'; cat "$f"; echo; echo "insert into gog.migrations (name) values ('$n');"; echo 'commit;'; } | run
done
echo "migracoes em dia"
