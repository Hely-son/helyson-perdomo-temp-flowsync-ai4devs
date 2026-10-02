#!/usr/bin/env bash
# Carga en la base de DESARROLLO una copia de producción, ya seudonimizada (INC-0412).
# Lo lanza `make copia-produccion`; no se ejecuta a mano ni lo ejecuta ningún agente.
#
#   1. Restaura la copia en `flowsync_staging`, una base nueva del servicio `db` a la que
#      el rol `flowsync_ro` no puede conectarse (se comprueba antes de restaurar nada).
#   2. Aplica allí database/seudonimizar.sql, que deja en el esquema `salida` solo lo que
#      viaja, ya seudonimizado.
#   3. Pasa `salida` a la base de desarrollo, SUSTITUYENDO users, tasks y los tokens que
#      hubiera, en una sola transacción: si algo falla, desarrollo queda como estaba.
#   4. Borra `flowsync_staging`, también si algo falla por el camino.
#
# La copia en bruto solo existe en el paso 1-2, dentro de ese contenedor: no se copia al
# contenedor (entra por la entrada estándar de pg_restore), no se escribe en ningún
# fichero temporal y no se imprime. Los datos ya seudonimizados pasan por variables del
# shell, no por disco.
#
# Un error de pg_restore o de psql sobre la base intermedia PUEDE citar un dato real
# (p. ej. «invalid input syntax for ...: "<valor>"»). Esta salida no se pega en ninguna
# herramienta externa sin revisarla antes.
set -euo pipefail

DUMP=${1:?uso: copia-produccion.sh <ruta de la copia (pg_dump, formato custom)>}
STAGING=flowsync_staging

cd "$(dirname "$0")/../.."   # raíz del repo, donde vive compose.yaml

# psql contra el servicio `db` como el rol que migra. `terse` quita DETAIL y CONTEXT de
# los errores, que citan la fila que falló. Quien llame decide la entrada estándar.
psql_db() { # psql_db <base> [argumentos de psql...]
  local base=$1
  shift
  docker compose exec -T db psql -X -q -v ON_ERROR_STOP=1 -v VERBOSITY=terse \
    -U flowsync -d "$base" "$@"
}

borrar_staging() {
  psql_db postgres -c "DROP DATABASE IF EXISTS $STAGING WITH (FORCE)" </dev/null
}

# Columnas de una tabla de `salida`, en su orden: el SQL de seudonimizar.sql es el único
# sitio que decide qué viaja, y aquí solo se lee lo que decidió.
columnas() { # columnas <tabla>
  psql_db "$STAGING" -tA </dev/null -c "
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'salida' AND table_name = '$1'"
}

# --- Antes de tocar nada ---------------------------------------------------------------

[ -f "$DUMP" ] || { echo "❌ No existe la copia: $DUMP" >&2; exit 1; }

# La base intermedia tendrá datos reales mientras exista: el puerto de `db` no puede
# estar abierto a la red (compose.yaml lo publica solo en 127.0.0.1; `make db-up` lo
# recrea si venía de antes).
expuesto=$(docker compose port db 5432 </dev/null | grep -v -E '^(127\.0\.0\.1|\[::1\]):' || true)
if [ -n "$expuesto" ]; then
  echo "❌ El puerto de la base 'db' escucha fuera de loopback ($expuesto)." >&2
  echo "   Revisa compose.yaml y lanza 'make db-up' antes de restaurar datos reales." >&2
  exit 1
fi

# El hash de la contraseña demo lo calcula Adonis (el SQL no sabe de scrypt) y entra al
# SQL por una variable de entorno, no por argumentos.
hash=$(cd backend && node ace seudonimizar:hash | tail -n1)
case "$hash" in
  '$scrypt$'*) ;;
  *) echo "❌ 'node ace seudonimizar:hash' no ha devuelto un hash scrypt." >&2; exit 1 ;;
esac
export DEMO_PW_HASH=$hash

# --- 1. Base intermedia, cerrada a flowsync_ro, y restauración --------------------------

# Desde aquí hay que borrarla pase lo que pase.
trap 'borrar_staging || echo "⚠️  No he podido borrar $STAGING: bórrala a mano (DROP DATABASE $STAGING) antes de seguir." >&2' EXIT

echo "🔐 Creando $STAGING (cerrada a flowsync_ro)..."
psql_db postgres </dev/null -c "DROP DATABASE IF EXISTS $STAGING WITH (FORCE)" \
  -c "CREATE DATABASE $STAGING" \
  -c "REVOKE ALL ON DATABASE $STAGING FROM PUBLIC"

# CONNECT viene concedido a PUBLIC por defecto; ya está revocado, pero se comprueba en
# lugar de fiarse. Si el rol no existe todavía no hay nadie a quien cerrar.
ro_conecta=$(psql_db postgres -tA </dev/null -c "
  SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'flowsync_ro')
              THEN has_database_privilege('flowsync_ro', '$STAGING', 'CONNECT')
              ELSE false END")
if [ "$ro_conecta" != "f" ]; then
  echo "❌ flowsync_ro podría conectarse a $STAGING: no restauro nada." >&2
  exit 1
fi

echo "📥 Restaurando la copia en $STAGING..."
# --no-owner / --no-privileges: los roles y permisos de producción no existen aquí.
if ! errores=$(docker compose exec -T db pg_restore -U flowsync -d "$STAGING" \
    --no-owner --no-privileges --exit-on-error < "$DUMP" 2>&1 >/dev/null); then
  echo "❌ pg_restore ha fallado. Solo líneas de pg_restore (pueden citar un dato real):" >&2
  printf '%s\n' "$errores" | grep '^pg_restore:' | cut -c1-200 >&2 || true
  exit 1
fi

# --- 2. Seudonimización -----------------------------------------------------------------

echo "🎭 Seudonimizando (database/seudonimizar.sql)..."
docker compose exec -T -e DEMO_PW_HASH db psql -X -q -v ON_ERROR_STOP=1 -U flowsync \
  -d "$STAGING" --single-transaction -f - < backend/database/seudonimizar.sql

cols_users=$(columnas users)
cols_tasks=$(columnas tasks)
users=$(psql_db "$STAGING" </dev/null -c 'COPY (SELECT * FROM salida.users ORDER BY id) TO STDOUT')
tasks=$(psql_db "$STAGING" </dev/null -c 'COPY (SELECT * FROM salida.tasks ORDER BY id) TO STDOUT')
[ -n "$users" ] || { echo "❌ La copia no tiene personas: ¿se ha restaurado bien?" >&2; exit 1; }

# --- 3. Sustitución en desarrollo, en una transacción -----------------------------------

echo "🔁 Sustituyendo los datos de la base de desarrollo..."
{
  # Los tres a la vez: se referencian entre sí por clave foránea. Las secuencias vuelven
  # a 1 y se reajustan al final, porque COPY con ids explícitos no las avanza.
  echo 'TRUNCATE auth_access_tokens, tasks, users RESTART IDENTITY;'
  echo "COPY users ($cols_users) FROM STDIN;"
  printf '%s\n' "$users"
  printf '%s\n' '\.'
  if [ -n "$tasks" ]; then
    echo "COPY tasks ($cols_tasks) FROM STDIN;"
    printf '%s\n' "$tasks"
    printf '%s\n' '\.'
  fi
  echo "SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM users;"
  echo "SELECT setval(pg_get_serial_sequence('tasks', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM tasks;"
} | psql_db flowsync --single-transaction -f -

# --- 4. Fuera la base intermedia --------------------------------------------------------

echo "🧹 Borrando $STAGING..."
borrar_staging
quedan=$(psql_db postgres -tA </dev/null -c "SELECT count(*) FROM pg_database WHERE datname = '$STAGING'")
[ "$quedan" = "0" ] || { echo "❌ $STAGING sigue existiendo." >&2; exit 1; }
trap - EXIT

psql_db flowsync -tA </dev/null -c "
  SELECT (SELECT count(*) FROM users) || ' personas y ' ||
         (SELECT count(*) FROM tasks) || ' tareas en la base de desarrollo'"
echo "✅ Listo. Entra con persona-<id> en el dominio flowsync.example y la contraseña flowsync-demo."
echo "   La copia sigue en $DUMP: bórrala tú cuando ya no haga falta."
