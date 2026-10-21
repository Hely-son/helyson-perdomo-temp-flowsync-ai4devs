#!/usr/bin/env bash
# PostToolUse (Write|Edit): AVISA, sin bloquear, cuando un archivo de
# frontend/src/ lleva un color escrito a pelo:
#   - hexadecimal (#3b82f6, #fff, también dentro de bg-[#...])
#   - función de color (rgb(), rgba(), hsl(), hsla(), oklch(), oklab())
#   - clase de paleta cruda de Tailwind (bg-blue-600, text-white, border-zinc-200…)
# frontend/src/index.css queda fuera: es la capa donde el valor literal sí se
# escribe, y de ahí salen los valores con nombre (bg-primary, text-muted-foreground…).
#
# No bloquea porque el archivo ya está escrito cuando corre (PostToolUse): lo
# que hace es devolverle al agente el aviso como contexto, con las líneas.
#
# ESTO ES UN AVISO, NO UNA REGLA. Lo que NO ve:
#   - De dónde sale una pieza de interfaz: si se dibuja de cero en vez de
#     traerla del catálogo (src/components/ui/), o si duplica una que ya existe.
#     Eso lo dice CLAUDE.md, no un grep.
#   - Un valor con nombre mal elegido (bg-destructive para algo que no es un error).
#   - Colores que se arman en tiempo de ejecución (`bg-${color}-500`, style con
#     variables), o que llegan por otra vía que no sea Write/Edit (sed, cat > …,
#     `npx shadcn add`, git checkout).
#   - Tamaños, radios o espaciados a pelo (w-[13px], rounded-[7px]): solo mira color.
# Mira el archivo entero, así que también avisa de lo que ya estaba antes.
set -uo pipefail

f=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -n "$f" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$f" in
  "$root"/frontend/src/index.css) exit 0 ;;
  "$root"/frontend/src/*) ;;
  *) exit 0 ;;
esac
[ -f "$f" ] || exit 0

palette='slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
patron="#[0-9a-fA-F]{3,8}([^0-9A-Za-z_-]|$)|(rgba?|hsla?|oklch|oklab)\(|(bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|divide|accent|caret|decoration|placeholder)-(($palette)-[0-9]{2,3}|black|white)([^0-9A-Za-z_-]|$)"

hallazgos=$(grep -nE "$patron" "$f" | head -20)
[ -n "$hallazgos" ] || exit 0

rel="${f#"$root"/}"
aviso="AVISO de colores-a-pelo.sh: ${rel} tiene colores escritos a pelo:
${hallazgos}
En frontend/ los colores salen de los valores con nombre de frontend/src/index.css (bg-primary, text-muted-foreground, border-border…), no de hexadecimales ni de la paleta cruda de Tailwind. Si de verdad hace falta un color nuevo, se declara allí con nombre y se usa por ese nombre. Esto es un aviso: no se ha bloqueado nada."

jq -n --arg msg "$aviso" '{
  systemMessage: $msg,
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: $msg }
}'
exit 0
