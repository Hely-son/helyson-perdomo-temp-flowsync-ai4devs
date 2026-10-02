#!/usr/bin/env bash
# PreToolUse (Bash): bloquea (exit 2) las órdenes que borran datos:
#   - node ace migration:fresh | migration:reset | db:wipe
#   - docker compose down con -v o --volumes
#   - SQL con DROP TABLE, DROP DATABASE, DROP SCHEMA o TRUNCATE
# Sin distinguir mayúsculas. `migration:rollback` NO se bloquea: la skill
# `revisar-migracion` lo necesita para probar la vuelta en la base de pruebas.
#
# ESTO ES UNA RED, NO UN CANDADO. Lo que NO ve:
#   - El SQL que entra por un archivo (`psql -f borrar.sql`, `< borrar.sql`) o
#     por la entrada estándar (`echo ... | psql`, heredoc): solo mira el texto
#     de la orden, no lo que hay dentro del archivo ni lo que se canaliza.
#   - Una orden escrita de otra forma: variables o subshells que arman el
#     comando (`$cmd`), base64, `docker-compose` con otra sintaxis, `docker
#     volume rm`, `rm -rf` sobre el volumen, `drop`/`truncate` partidos en dos
#     cadenas, o un script (`npm run`, `make`, `node script.js`) que lo haga
#     por dentro.
#   - Todo lo que se haga por el servidor MCP (`dbhub`): no pasa por Bash, así
#     que este hook ni se entera.
# Por eso el candado de verdad es el ROL: `flowsync_ro` solo tiene SELECT y no
# puede borrar nada aunque este hook falle. Esto solo atrapa el descuido obvio.
set -uo pipefail

cmd=$(jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

bloquear() {
  {
    echo "BLOQUEADO por sin-borrar-datos.sh: $1"
    echo "Por qué: esta orden borra datos de la base y no se puede deshacer."
    echo "Si lo necesitas de verdad, díselo a la persona responsable para que lo ejecute ella; no reescribas la orden para esquivar el bloqueo."
    echo "Para probar la vuelta de una migración usa \`NODE_ENV=test node ace migration:rollback\` contra la base de pruebas."
  } >&2
  exit 2
}

# Ace: migration:fresh, migration:reset, db:wipe (migration:rollback pasa).
if printf '%s' "$cmd" | grep -Eiq '(^|[^[:alnum:]_:-])(migration:(fresh|reset)|db:wipe)([^[:alnum:]_:-]|$)'; then
  bloquear "comando de Ace que vacía la base (migration:fresh, migration:reset o db:wipe)."
fi

# docker compose down con -v / --volumes (también `docker-compose`, y -v
# agrupado con otras letras como -rv).
if printf '%s' "$cmd" | grep -Eiq 'docker([[:space:]]+|-)compose([^;&|]*)[[:space:]]down([[:space:]]|$)'; then
  if printf '%s' "$cmd" | grep -Eiq '[[:space:]]down[[:space:]]([^;&|]*[[:space:]])?(--volumes|-[A-Za-z]*v[A-Za-z]*)([[:space:]]|$)|--volumes([[:space:]]|$)'; then
    bloquear "docker compose down con -v/--volumes, que borra el volumen de la base de desarrollo."
  fi
fi

# SQL destructivo, sin distinguir mayúsculas.
if printf '%s' "$cmd" | grep -Eiq '(^|[^[:alnum:]_])drop[[:space:]]+(table|database|schema)([^[:alnum:]_]|$)'; then
  bloquear "SQL con DROP TABLE, DROP DATABASE o DROP SCHEMA."
fi
if printf '%s' "$cmd" | grep -Eiq '(^|[^[:alnum:]_])truncate([^[:alnum:]_]|$)'; then
  bloquear "SQL con TRUNCATE."
fi

exit 0
