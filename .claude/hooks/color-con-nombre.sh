#!/usr/bin/env bash
# PostToolUse (Write|Edit): AVISA (exit 2) cuando el texto que se acaba de
# escribir en un archivo de frontend/src/ trae un color a pelo:
#   - un hexadecimal literal (#fff, #1a2b3c, #1a2b3c80)
#   - una clase de paleta cruda de Tailwind: utilidad + familia de color +
#     número (bg-blue-600, text-red-500, dark:border-gray-200/50...)
# Los colores con nombre (bg-primary, text-destructive...) salen de los tokens de
# frontend/src/index.css, que queda EXCEPTUADO: es la capa donde el valor
# literal se escribe, y una sola vez.
#
# AVISA, NO BLOQUEA. En PostToolUse la herramienta ya ha escrito el archivo, así
# que el exit 2 no deshace nada: solo le pone el mensaje delante a quien escribió.
# Hay casos legítimos (una ilustración, un color de marca de un tercero) y lo que
# se busca es que la desviación se vea, no que sea imposible.
#
# Mira solo el texto que se escribe (`new_string` de Edit, `content` de Write),
# no el archivo entero: así no regaña por lo que ya estaba antes.
#
# ESTO ES UNA RED, NO UN CANDADO. Lo que NO ve:
#   - Colores que no son hexadecimales ni clases de paleta: `rgb()`, `hsl()`,
#     `oklch()`, nombres CSS (`red`), `text-white`/`text-black`, o valores
#     arbitrarios de Tailwind (`bg-[#fff]` sí lo ve por el hexadecimal; `bg-[rgb(0,0,0)]` no).
#   - Una clase armada por partes (`` `bg-${color}-600` ``).
#   - Lo que se cambie fuera de Claude (el editor, `sed`, `shadcn add`).
#   - Falsos positivos: un anclaje `#add`, un `#412` en un comentario o un
#     identificador que parezca hexadecimal también saltan.
set -uo pipefail

entrada=$(cat)

archivo=$(printf '%s' "$entrada" | jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -n "$archivo" ] || exit 0

proyecto="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Solo frontend/src/, y dentro, todo menos index.css.
case "$archivo" in
  "$proyecto/frontend/src/index.css") exit 0 ;;
  "$proyecto"/frontend/src/*) ;;
  *) exit 0 ;;
esac

texto=$(printf '%s' "$entrada" | jq -r '.tool_input.new_string // .tool_input.content // empty')
[ -n "$texto" ] || exit 0

# Dos valores seguidos (`#fff #000`) compartirían el carácter que los separa y
# el segundo no se encontraría; duplicando los separadores cada uno tiene el suyo.
texto=$(printf '%s' "$texto" | sed -E 's/([^[:alnum:]_#&-])/\1\1/g')

hex=$(printf '%s' "$texto" \
  | grep -Eo '(^|[^[:alnum:]_&#-])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})([^[:alnum:]_-]|$)' \
  | sed -E 's/^[^#]*//; s/[^#0-9a-fA-F].*$//' | sort -u | head -5 | paste -sd ' ' -)

utilidad='bg|text|border|border-[xytrblse]|ring|ring-offset|fill|stroke|from|via|to|outline|divide|decoration|shadow|accent|caret|placeholder'
familia='slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
paleta=$(printf '%s' "$texto" \
  | grep -Eo "(^|[^[:alnum:]_-])($utilidad)-($familia)-(50|100|200|300|400|500|600|700|800|900|950)([^[:alnum:]-]|$)" \
  | sed -E 's/^[^[:alnum:]]*//; s/[^[:alnum:]]$//' | sort -u | head -5 | paste -sd ' ' -)

[ -n "$hex" ] || [ -n "$paleta" ] || exit 0

{
  echo "AVISO de color-con-nombre.sh en ${archivo#"$proyecto"/}:"
  [ -n "$hex" ] && echo "  - color hexadecimal literal: $hex"
  [ -n "$paleta" ] && echo "  - clase de paleta cruda de Tailwind: $paleta"
  echo "Por qué: los colores del frontend tienen nombre (bg-primary, text-muted-foreground, text-destructive...) y su valor vive en frontend/src/index.css, una sola vez. Un color a pelo no sigue el tema ni el modo oscuro."
  echo "Qué hacer: usa el valor con nombre. Si no hay uno que sirva, añade el token en frontend/src/index.css. Si de verdad es un caso legítimo, déjalo y dilo en tu respuesta; esto avisa, no bloquea."
} >&2
exit 2
