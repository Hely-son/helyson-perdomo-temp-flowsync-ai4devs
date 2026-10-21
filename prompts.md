# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Opus 1M xHigh
**Herramienta:** Claude Code

```
Añade una barra de progreso sobre la pantalla de tareas, colocada justo encima del listado, que muestre de forma visual qué proporción de las tareas que se están viendo se encuentra actualmente en estado done. Hazlo en una sola pasada y asegúrate de cerrar tu trabajo con un commit según las normas del proyecto.
```

**Qué salió:** funcionó a la primera, comprobado en la app (headless Chrome): trajo `Progress` de shadcn a `components/ui/` + `components/task-progress.tsx`; el CLI de shadcn metió un paquete npm `cn` ajeno y hubo que quitarlo; la barra mide lo visible, así que marca siempre 0 % o 100 % (commit `86952b3`).

## Prompt 2

**Modelo:** Opus 1M xHigh
**Herramienta:** Claude Code

```
Necesito añadir un mecanismo de control y una directriz para el repositorio:
1. Crea un hook en la carpeta correspondiente dentro de .claude/hooks/ (puedes tomar como referencia el modelo existente en .claude/hooks/migracion-con-vuelta.sh) que avise (sin bloquear la ejecución) cada vez que se detecte un color escrito a pelo directamente en la carpeta frontend/src/, excluyendo explícitamente al archivo frontend/src/index.css. Registra este hook correctamente en .claude/settings.json.
2. Añade una regla clara en el archivo CLAUDE.md del repositorio que especifique de dónde deben extraerse obligatoriamente las piezas de interfaz nuevas.
3. Para probar el funcionamiento del hook, modifica el color de la barra de progreso que creaste antes utilizando un color en formato de texto plano (por ejemplo, un código hexadecimal directo como #3b82f6) y observa la respuesta del agente.

```

**Qué salió:** funcionó, comprobado: `.claude/hooks/migracion-con-vuelta.sh` no existe (se usó `sin-borrar-datos.sh` de modelo); el hook `colores-a-pelo.sh` saltó en vivo al meter `#3b82f6` (línea 32) sin bloquear, y la barra se pintó `rgb(59, 130, 246)` en la app.
