---
name: frontend-feature
description: Procedimiento obligatorio para cualquier pieza de interfaz nueva del frontend de FlowSync. Explora el encargo y el catálogo, propone un plan con la pieza, de dónde sale cada parte (catálogo, CLI de shadcn o nueva y declarada) y la lista de estados con su historia, y se para a esperar aprobación. Después escribe las historias con el subagente story-writer, comprueba con make test-ui que fallan, las congela por su huella, construye la pieza con el subagente ui-implementer hasta el verde y comprueba que las historias no cambiaron. Cierra con lint, build, commit en una rama feat/ y un pull request. Usar siempre que una tarea cree o rehaga una pieza de interfaz, aunque nadie lo pida.
---
# Una pieza de interfaz, de encargo a verde

Este es el orden, y no se cambia: **explorar → plan → (aprobación) → historias → rojo → congelar → construir → verde → huella intacta → cierre**. Cada paso existe porque sin él algo salió mal o solo salió bien porque alguien lo pidió así, entero y en orden.

Rutas: `make` desde la **raíz** del repo. `npm`, `npx` y `shadcn` desde **`frontend/`** (desde la raíz, `npm --prefix frontend …`).

## 0. Antes de empezar

- Rama: la de `CLAUDE.md` («Reglas de proceso»). Si estás en `main` o en una `sN/*`, crea `feat/<slug>`. Si ya es una rama de trabajo, sigues en ella.
- Mira `git status --short` y apunta lo que ya estaba sin commitear, **y si `frontend/package.json` o `frontend/package-lock.json` ya tenían cambios**. No es de esta tarea y los subagentes no deben tocarlo.
- Que existan `frontend/node_modules` y los navegadores de Playwright (`make test-ui` falla sin ellos con un error que no explica nada). Si faltan: `make install`.
- No hace falta base de datos ni servidores: las historias no los usan.

## 1. Explorar

- Lee el encargo entero. Si viene de un change de OpenSpec, lee su `design.md` y los Scenarios que toca la interfaz.
- **El catálogo, por el disco, no por memoria**: `ls frontend/src/components/ui`, y lee los que la pieza va a usar (sus variantes y tamaños salen del `cva`, no se suponen).
- Los tokens de color, en `frontend/src/index.css`, y una pieza vecina del mismo tipo en `frontend/src/components/` para copiar su registro.
- La pantalla donde se va a usar, si ya está decidida (`frontend/src/pages/`), para saber qué datos le llegan.
- Saca la **lista de estados** de la pieza: cada aspecto distinto (variante, tamaño, vacío, cargando, error, deshabilitado, inválido, largo…) y, en cada uno, si tiene **comportamiento** (escribir, pulsar, abrir, cambiar un valor…). Una historia por estado; una `play` en cada uno con comportamiento.
- Decide el **contrato de la pieza** que las historias van a fijar y que la implementación tendrá que respetar: ruta del archivo, nombre exportado, props con sus nombres y tipos, y los nombres accesibles (`aria-label`, texto de los botones) que las interacciones van a usar. Si no se fija ahora, quien escribe las historias y quien construye eligen nombres distintos.

## 2. Plan, y PARA

Presenta el plan con **una parte por fila**, y para cada una **de dónde sale**: *catálogo* (ya está en `ui/`), *CLI* (se trae con `npx shadcn@latest add`) o *nueva y declarada* (el catálogo no la tiene ni la va a tener; se escribe a mano con un comentario que lo dice). La que no haga falta se declara con su porqué, no se omite.

| Parte | Procedencia | Archivo | Comando (desde `frontend/`) |
|---|---|---|---|
| La pieza | nueva / compone | `frontend/src/components/<nombre>.tsx` | a mano |
| `<pieza del catálogo>` | catálogo | `frontend/src/components/ui/<x>.tsx` | — |
| `<pieza que falta>` | CLI | `frontend/src/components/ui/<y>.tsx` | `npx shadcn@latest add <y>` |
| Historias | — | `frontend/src/components/<nombre>.stories.tsx` | a mano (`story-writer`) |
| Integración en la pantalla | — | `frontend/src/pages/<pantalla>.tsx` | a mano |

Debajo, añade:
- la tabla **Estado → historia → ¿`play`? → qué afirma**;
- el **contrato** del paso 1;
- las decisiones abiertas que vea quien aprueba: colores (¿algún valor a pelo? solo si se pide, y se declara), qué hace la pieza ante datos largos o vacíos, y todo lo que se aparte del catálogo;
- lo que queda fuera.

**Detente aquí y espera la aprobación explícita.** No lances ningún subagente ni crees ningún archivo antes. Si piden cambios, rehaz el plan y vuelve a parar.

## 3. Historias: subagente `story-writer`

Lánzalo en primer plano, porque lo siguiente depende de él. Pásale: el encargo, el contrato, la tabla de estados aprobada y la ruta de las historias. **No le pases la implementación ni las pantallas**: no puede leerlas.

Al volver, lee los archivos tú: una historia por estado, `args` como datos, nada de red ni de reloj, una `play` en cada estado con comportamiento, elementos localizados por rol/etiqueta/texto y no por clase, ninguna espera por tiempo. Pasa tú también `npx prettier --check` y `npx oxlint` sobre ellos desde `frontend/`.

## 4. Comprueba el rojo

`make test-ui` desde la raíz. Guarda la salida y quítale los colores para leerla:

```bash
make test-ui > <scratchpad>/rojo.txt 2>&1; sed 's/\x1b\[[0-9;]*m//g' <scratchpad>/rojo.txt | grep -E 'FAIL|Error|Test Files|Tests '
```

- Las historias nuevas tienen que fallar **y por el motivo esperado**: lo normal es que el archivo no resuelva el import de la pieza que aún no existe. Enseña el motivo de cada archivo.
- **Si alguna nace en verde, para y dilo.** Pasa si la pieza ya existía o si una historia no afirma nada. Se arregla volviendo a `story-writer`, nunca dejándola pasar.
- Las historias que ya existían (`button`, `alert`, `input`…) siguen en verde. Si alguna estaba en rojo antes de empezar, apúntalo para no atribuírselo a esta tarea.

## 5. Congela las historias

```bash
git add frontend/src/components/<nombre>.stories.tsx
shasum frontend/src/components/<nombre>.stories.tsx | tee <scratchpad>/congeladas.sha
```

(Todos los `*.stories.tsx` nuevos de la tarea.) Enseña la huella en el chat. Esa huella es la garantía: no hay hook ni script que la sustituya. Si la sesión no tiene scratchpad, guárdala donde puedas volver a leerla y no la commitees.

## 6. Construcción: subagente `ui-implementer`

Lánzalo en primer plano con: el encargo, el plan aprobado entero (la tabla con la procedencia de cada parte y las decisiones), la ruta de las historias congeladas y la lista de cambios ajenos sin commitear del paso 0 (incluido el estado previo de `package.json`/`package-lock.json`). Trabaja hasta que `make test-ui` salga en verde.

**Disputas.** Si devuelve una, se la trasladas a quien aprobó el plan tal cual: historia, archivo y línea, lo que dice el encargo, lo que exige la historia y la propuesta. No cambias la historia tú, y él tampoco. Si se acepta, la corrige `story-writer`, se vuelve a comprobar el rojo de esa historia y se vuelve a congelar (pasos 4 y 5) antes de seguir con `ui-implementer`.

## 7. Verde y huella intacta

```bash
shasum -c <scratchpad>/congeladas.sha
git diff --stat -- 'frontend/src/**/*.stories.tsx'   # vacío: nada sin stagear encima de lo congelado
make test-ui                                          # tú, no solo el subagente
```

Si la huella no cuadra, la pieza no se da por buena aunque esté en verde: dilo y para. Comprueba además, sin fiarte del informe del subagente:

- `git diff frontend/package.json frontend/package-lock.json`: solo lo que el plan justifica. Nada de paquetes sueltos (ver «Lo que ya se aprendió»).
- Que el `import { cn }` de cualquier archivo nuevo de `ui/` es de `@/lib/utils`.
- Que el hook `color-con-nombre.sh` no ha dejado avisos sin resolver ni sin declarar.

## 8. Cierre

```bash
npm --prefix frontend run lint
npm --prefix frontend run build      # incluye el typecheck
```

Los dos limpios. Después, siguiendo las «Reglas de proceso» de `CLAUDE.md`:

1. **Commit** con la skill `/commit`, en la rama `feat/<slug>` del paso 0. Una pieza y sus historias van en el mismo commit; si la tarea ha tocado además `package.json`/`package-lock.json`, entran porque el plan lo dijo. Nunca en `main` ni en una `sN/*`. Lo que no es de esta tarea (los cambios ajenos del paso 0) no entra.
2. **Pull request** con `gh pr create`, con la descripción completa de los cambios en el cuerpo: la pieza, la tabla de procedencia, la tabla de estados con su historia, las desviaciones declaradas y lo que quedó fuera. El PR publica el catálogo en Chromatic (`.github/workflows/chromatic.yml`), así que el cuerpo dice qué mirar allí.
3. El pase del subagente **`adversarial-reviewer`** sobre ese PR, que es lo último antes de dar la unidad por terminada, y **una sola vez al acabar la unidad de trabajo**, no al cerrar cada petición.
4. Responde solo con la **URL del PR**: la sesión se va a perder, el PR no.

Si `git push` lo para el hook `pre-push` (`make test-ui` en rojo), arregla la causa; no uses `--no-verify` por tu cuenta.

### Informe

Va en el cuerpo del PR, no en el chat: tabla parte → procedencia → archivo → comando; tabla estado → historia → rojo (con el motivo) → verde; la huella con `shasum -c` en OK; las disputas, las decisiones abiertas y todo lo que se hizo fuera del plan.

## Lo que ya se aprendió haciéndolo

**El CLI de shadcn**
- **`npx shadcn@latest add <x>` ensució el proyecto la primera vez.** Escribió `import { cn } from "cn"` en el archivo generado y añadió un paquete llamado `cn` a `package.json` y a `package-lock.json`, que no es nuestro helper. Se arregló deshaciendo `package.json` y el lock, borrando `node_modules/cn` y cambiando ese import por `import { cn } from "@/lib/utils"`, como en el resto de `ui/`. Es lo único que se toca a mano de un archivo generado. Mira siempre el diff de `package.json` justo después de lanzarlo.
- El catálogo no se edita para una pantalla concreta: se pisa desde el componente propio. El relleno de la barra se coloreó con `*:data-[slot=progress-indicator]:bg-blue-600` en el `className`, sin tocar `ui/progress.tsx`; en Tailwind v4 eso gana al `bg-primary` del catálogo por especificidad.
- Las dependencias se instalan con `--legacy-peer-deps`, como el resto del proyecto. `@playwright/test` va en la misma versión que `playwright`.

**Las historias**
- **Una historia por estado, no por componente.** Si el encargo pide variante × tamaño, se lee del `cva` y son todas las combinaciones (el `Button` son 6 × 8 = 48). Storybook las indexa de forma estática: se escriben todas, generándolas con un script si hace falta.
- Los tamaños `icon*` son cuadrados: llevan un icono y `aria-label`, no texto.
- **`args` como datos**, no dentro del cuerpo: es lo que mueven los controles y las comprobaciones. Un `children` en JSX también va en `args`.
- Nada de red ni de reloj: ni `fetch`, ni `Date.now()`, ni `Math.random()`.
- **Un campo sin etiqueta visible necesita `aria-label`**: sin él el chequeo de accesibilidad se queja y la interacción no tiene cómo localizarlo.
- **`.storybook/preview.tsx` tiene que importar `../src/index.css`**: sin eso las historias salen sin Tailwind ni los tokens. El instalador no lo hace.
- **Una `play` que no puede fallar no afirma nada.** Se comprueba rompiendo a propósito una aserción un momento (`toHaveValue('')` → `toHaveValue('no vacío')`), viendo que falla esa historia y solo esa, y restaurando.
- La interacción usa las utilidades del propio catálogo: `expect` de `storybook/test` y `canvas` y `userEvent` del contexto de `play`; el elemento se localiza por rol y nombre (`getByRole('textbox', { name })`), nunca por clase; sin esperas por tiempo.
- El chequeo de accesibilidad del instalador está en `'todo'`: enseña las violaciones pero no hace fallar `make test-ui`. No te fíes de que un verde significa accesible.
- El instalador de Storybook deja ejemplos suyos (`Button`, `Header`, `Page` en `src/stories/`) y una página de bienvenida con imágenes: no son del proyecto y no se commitean.

**El rojo**
- Una historia de una pieza que no existe nace en rojo por el import que no resuelve, y eso es lo esperado: enseña el motivo, no solo el recuento.
- `make test-ui` pasa **todas** las historias del catálogo en un Chromium sin ventana, sin servidor ni base de datos (unos 5 s). Cuenta las que había antes para saber cuántas son nuevas.

**Lo que no es esta skill**
- **El recorrido de navegador (`make test-web`) es uno solo** (registrarse, escribir una tarea, verla en la lista). Los estados de una pieza no se comprueban ahí, se comprueban en su historia. Esta skill no escribe recorridos nuevos. Y `make test-web` necesita la aplicación entera levantada y **escribe cuentas y tareas de prueba en la base de desarrollo**: no lo lances por tu cuenta.
- El hook `pre-push` (`make hooks`, una vez por clon) corre `make test-ui` antes de empujar y no corre `test-web` a propósito: un disparador que falla porque el servidor no estaba se desactiva a la segunda.

**Los guardarraíles**
- El hook `color-con-nombre.sh` **avisa, no bloquea** (exit 2 en `PostToolUse`: el archivo ya está escrito). Un color a pelo pedido expresamente se deja y se declara en un comentario junto al elemento, en el informe y en el `design.md` del change si lo hay. No se esquiva.
- Los colores son tokens del tema; su valor vive solo en `frontend/src/index.css`.
- `tsc -b` solo cubre `src/` y `vite.config.ts`: `frontend/e2e/` y `playwright.config.ts` no pasan por el typecheck.
- El hook de Prettier solo corre sobre lo que escribe Claude con Write/Edit. Lo que genera el CLI o un script hay que pasarlo por `npx prettier --write` a mano; `.storybook/main.ts` y `vite.config.ts` los dejó el instalador sin formatear.
- Un elemento decorativo que repite lo que dice el texto (la barra de progreso) lleva `aria-hidden`: el texto lleva la información.
- Un porcentaje se redondea **hacia abajo**: así el 100 % solo significa todo hecho.

Esta skill **sí hace commit y abre el PR** (paso 8), a diferencia de `backend-feature`, porque una pieza de interfaz con sus historias es una unidad completa. El `adversarial-reviewer` y la respuesta solo con la URL siguen las «Reglas de proceso».
