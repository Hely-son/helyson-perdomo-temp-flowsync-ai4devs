## Context

Motivación y alcance en `proposal.md`; requisito en `specs/tasks/spec.md`.

Estado actual de `frontend/src/pages/tasks-page.tsx`:

- La pantalla pide `GET /api/v1/tasks` con el filtro de la URL (`?status=`). Sin filtro llegan `pending` e `in_progress`; con `status=done` solo las hechas. Ningún alcance mezcla las hechas con el resto (spec `tasks`, «Una sola lista compartida del espacio»), y la lista **no está paginada**, así que `length` de cada respuesta es el recuento real.
- Ya existe un `doneCount`, pero solo se resuelve cuando la vista por defecto llega vacía, y solo sirve para decir «hay N terminadas». No es reutilizable como resumen: depende del filtro y de que la lista esté vacía.
- Los cambios de estado son optimistas, con vuelta atrás si el servidor los rechaza; la creación añade la fila por arriba. El resumen tiene que seguir ambos caminos.
- Regla del proyecto: `lib/api.ts` es el único punto de contacto con la API (ya tiene `listTasks`, no hace falta nada nuevo), y los elementos de interfaz salen del catálogo de `components/ui/` o se justifican.

## Goals / Non-Goals

**Goals:**

- Un recuento y un porcentaje de tareas hechas sobre **todo el espacio**, independiente del filtro, que se mantenga al día al crear y al cambiar de estado sin recargar.
- Que un fallo al calcularlo no estropee la lista.
- Cálculo en una función pura, comprobable sin montar la pantalla (no hay runner de tests en el frontend; ver Riesgos).

**Non-Goals:**

- Endpoints, campos o agregados nuevos en el backend, OpenAPI, Postman o `docs/capabilities/tasks/README.md`.
- Tocar el comportamiento de `doneCount` y de los finales de lista vacía (ver Decisión 4).
- Mostrar el desglose entre pendientes y en curso, gráficos o histórico.
- Refrescar el resumen por cambios de otras personas: como el resto de la pantalla, se calcula al entrar y con las acciones propias.

## Decisions

### 1. Qué cuenta: todo el espacio, no las filas visibles

El resumen es `hechas / (abiertas + hechas)` sobre el espacio entero. Contar sobre las filas visibles daría 0 % o 100 % por construcción y no informaría de nada. Se confirmó con el usuario al proponer el cambio.

Alternativas descartadas: contar solo lo visible (degenerado); mostrarlo solo en la vista por defecto (el indicador desaparecería al filtrar sin motivo, y con la misma carga de datos).

### 2. De dónde salen los números: dos consultas independientes del filtro

Un efecto propio, que depende solo de `token`, pide `listTasks(token)` (abiertas) y `listTasks(token, 'done')` (hechas) y guarda `{ open, done }` con sus `length`. No depende de `statusParam`: cambiar de filtro no repite ni invalida el resumen.

Alternativas:

- **Reutilizar la respuesta de la vista** cuando coincide con una de las dos consultas (`open` si no hay filtro, `done` si el filtro es `done`). Ahorra una petición en dos de las cinco vistas, pero acopla el resumen al efecto de la lista, que se reinicia con cada filtro, y obliga a recomponer el recuento al cambiar de vista. Se descarta por complejidad frente a una petición de más sobre una lista sin paginar.
- **Tres consultas, una por estado**: no aporta nada; `pending` + `in_progress` ya son la consulta por defecto.

Coste asumido: una petición duplicada con la vista por defecto.

### 3. Mantener el recuento con deltas, no volviendo a pedir

El estado del resumen se ajusta en los mismos puntos donde la pantalla ya actualiza sus filas:

- Crear: `open + 1` (toda tarea nace pendiente).
- Cambiar estado (optimista): si `done` ↔ no-`done`, mueve 1 entre `open` y `done`; entre `pending` e `in_progress` no cambia.
- Fallo del servidor: el delta inverso, con el estado previo que la función ya guarda.

La lógica del delta vive en una función pura en `lib/` (`(recuento, estadoOrigen, estadoDestino) → recuento`), junto con la que calcula el porcentaje; la pantalla solo las llama. Volver a pedir las dos listas tras cada acción duplicaría tráfico y haría parpadear el resumen justo cuando la fila ya se ha movido.

### 4. `doneCount` existente no se toca

`doneCount` y los cuatro finales de lista vacía quedan como están. El resumen y `doneCount` terminan pidiendo lo mismo en un caso (vista por defecto vacía), pero fusionarlos cambia comportamiento ya especificado («Una lista sin filas no significa siempre lo mismo») y queda fuera de este cambio. Es una limpieza posible después, y está anotada en Open Questions.

### 5. Porcentaje: entero, hacia abajo

`Math.floor(done * 100 / total)`. Con `Math.round`, 199 de 200 se mostraría como 100 %, que afirma «todo hecho» cuando no lo está. Con `floor`, 100 % significa exactamente `done === total`. Con `total === 0` la función no se llama: no se pinta el resumen.

### 6. Cuándo se pinta y cuándo no

- `summary === null` (cargando o fallo de carga): no se pinta nada. No hay esqueleto ni aviso: es información secundaria y no debe competir con el spinner de la lista ni con su alerta de error.
- `total === 0`: no se pinta (el espacio vacío ya tiene su explicación).
- Resto: se pinta, incluido `0 de N · 0 %`.

Una nota sobre la petición original: decía «no aparece cuando no hay tareas a la vista». Con el recuento sobre todo el espacio se interpreta como «cuando el espacio no tiene tareas»; si la lista actual está vacía pero el espacio tiene tareas (por ejemplo, todo hecho, o un filtro sin resultados), el resumen se sigue mostrando, porque es justo entonces cuando más información da.

### 7. Componente y catálogo

Un componente nuevo (`task-progress.tsx` en `components/`) que recibe el recuento `{ open, done }` y pinta una línea de texto con el recuento y el porcentaje, y debajo una barra de progreso. La barra se pidió expresamente al aplicar el cambio (la primera versión del diseño la descartaba).

El catálogo no tiene barra, así que se trae la pieza oficial con `npx shadcn@latest add progress` (sin editarla a mano, como el resto de `ui/`) en lugar de dibujar una a mano. Se alimenta con el mismo porcentaje entero de la Decisión 5, y el texto lleva los números, de modo que la barra es un refuerzo visual y no la única fuente de la información. Colores con los tokens del tema (`bg-primary/20` de la pista y `text-muted-foreground` del texto), con **una excepción declarada**: el relleno de la barra va en `bg-blue-600`, a pelo, por petición expresa al aplicar el cambio. Se pisa desde `task-progress.tsx` con un selector sobre el hijo `data-slot="progress-indicator"`, sin tocar `ui/progress.tsx`. El hook `color-con-nombre.sh` avisa de ello y se deja. El texto va con `role="status"` y `aria-live="polite"` para que un lector de pantalla note el cambio sin interrumpir; la barra, al ser redundante con ese texto, no se anuncia por separado.

## Risks / Trade-offs

- **Carrera al cargar** → si el resumen tarda más que la lista y la persona cambia un estado antes de que llegue, el delta se aplicaría sobre `null` y se perdería. Mitigación: los deltas se ignoran mientras el resumen es `null`, y la respuesta que llega ya recoge el estado del servidor tras esa acción en la mayoría de los casos; el desfase posible es de una tarea, y se corrige en la siguiente entrada a la pantalla. Se acepta.
- **Deriva con otras personas** → otra cuenta puede cambiar tareas mientras esta pantalla está abierta, y el resumen (como la lista) no lo sabe. Mitigación: ninguna; es el comportamiento de toda la pantalla y la spec dice que no hay señales de presencia.
- **Petición duplicada** → ver Decisión 2. Se acepta a cambio de no acoplar resumen y lista.
- **No hay runner de tests en el frontend** → la verificación de este cambio es `npm run build` (typecheck), `npm run lint` y comprobación manual de los escenarios del spec. La lógica de cálculo está aislada en funciones puras justamente para poder cubrirla si se instala un runner.
- **Cambio de estado con vuelta atrás** → los deltas directo e inverso tienen que ir emparejados; un camino que aplique uno y olvide el otro dejaría el resumen descuadrado. Mitigación: ambos usan la misma función con los estados invertidos.

## Open Questions

- ¿Fusionar `doneCount` con el resumen para ahorrar la consulta repetida en la vista por defecto vacía? Se puede decidir después sin cambiar la spec de este cambio.
