## Context

Ver `proposal.md` — Why. Las tareas se leen por muchos caminos (la lista y sus filtros, la tarea suelta, y dos escrituras que parten de una tarea existente: cambiar el estado y cambiar la fecha), y todos pasan por el modelo `Task`. La historia E2-10 exige que lo borrado **no salga por ninguno** (CA-8c), y avisa de que el borrado era la única acción irreversible del producto: el fallo caro es el silencioso, una ruta que olvide excluir lo borrado y lo siga sirviendo.

## Goals / Non-Goals

**Goals:**

- Que una tarea borrada sea **estructuralmente incapaz** de salir por un camino que alguien escriba después, y no solo que hoy no salga por los cinco que existen.
- Que borrar sea reversible por cualquier miembro: la papelera guarda, no destruye.
- Que «ya no existe» sea una sola respuesta para todos los casos (borrada, borrada por otra persona hace un momento, inexistente).

**Non-Goals:**

- La interfaz y la confirmación (CA-4 a CA-7).
- Vaciar la papelera, y cuánto tiempo se guarda lo borrado.
- Tocar el validador de la lista.

## Decisions

### 1. La papelera es una columna con fecha, no un booleano ni una tabla aparte

`tasks.deleted_at`, nulable: nulo es viva, con valor es borrada *desde ese instante*. Responde a «cuándo se borró» (CA-8) y a la vez es la marca, así que no hay una segunda columna que pueda contradecirla.

**Alternativa descartada:** una tabla `trashed_tasks` a la que se mueve la fila. Obliga a copiar y borrar en una transacción, a mantener dos esquemas iguales, y a que restaurar sea otro movimiento que pueda fallar a medias. Con una columna, borrar y restaurar son una sola escritura cada una.

### 2. Lo borrado se esconde en el modelo, con hooks, y la papelera es otro modelo

`Task` declara `before:find` y `before:fetch` que añaden `deleted_at IS NULL` a toda lectura. Por ahí pasan `Task.query()`, `find`, `findOrFail`, `first` y `all`, que es lo que usan los cinco endpoints actuales. La lista, el filtro, la tarea suelta, el cambio de estado y el cambio de fecha **no cambian una línea**: reciben la regla sin enterarse. Un endpoint nuevo que consulte `Task` también.

La papelera es `TrashedTask`, un segundo modelo sobre la misma tabla con el filtro invertido, que solo sirve para listar y restaurar. No existe un «`Task` con borradas incluidas» que alguien pueda activar sin querer.

**Alternativa descartada:** un filtro explícito en cada controlador (`whereNull('deleted_at')`). Es la solución obvia y la que falla en silencio: bastaría con que la sexta ruta lo olvide. **Alternativa descartada:** un `withTrashed()` en el query builder de `Task`, que es el patrón habitual de borrado lógico: deja a un solo método de distancia exactamente lo que CA-8c prohíbe.

**Límite conocido.** Los hooks de Lucid no se ejecutan en `update`/`delete` masivos ni en SQL escrito a mano. Hoy no hay ninguno que toque `tasks`. Los tests recorren cada ruta de la API y comprueban además el mecanismo (`Task.find`, `Task.query()`, `Task.all()`), y quitar el hook los hace fallar (se comprobó).

### 3. Borrar responde `200` con la tarea, no `204`

Devuelve la tarea con su `deletedAt` (forma `TrashedTask`). Es lo que la interfaz necesitará para ofrecer deshacer sin otra petición, y mantiene la regla del proyecto de que toda respuesta pasa por `serialize()`.

### 4. «Ya no existe» es un único `404`

Borrar una tarea borrada, abrirla, cambiarle el estado y cambiarle la fecha dan el mismo `404` que una tarea inexistente, porque para `Task` es exactamente eso. Restaurar una tarea viva también: la papelera no la encuentra. Así CA-11 no necesita un caso especial.

### 5. Restaurar devuelve la forma de lista

`TaskTransformer`, sin vencimiento, como el cambio de estado. La fecha vuelve intacta (se comprueba abriéndola después), pero no hace falta enseñarla en la respuesta.

### 6. Borrar y restaurar mueven `updated_at`

Se guardan con `save()`, y Lucid actualiza `updated_at`. Borrar es una modificación de la tarea, y nada en la historia pide lo contrario: CA-8b enumera título, estado, responsable y vencimiento, no las marcas de tiempo.

## Reversibilidad

**Rama (convención 5): reversible.** Una sola migración, `add_deleted_at_to_tasks_table`, que añade `tasks.deleted_at` (`timestamptz`, nulable, sin valor por defecto).

- **Filas que toca, contadas contra la base de desarrollo por el MCP:** 230 tareas en total y **0 modificadas**. Ninguna tarea nace borrada. Antes de la migración no existía ninguna columna `deleted_at`.
- **`down`:** `DROP COLUMN deleted_at`. Devuelve el esquema exactamente a como estaba. Lo único que descarta es la marca de las tareas que estén en la papelera en ese momento: **dejan de estar borradas y vuelven a la lista**, y se pierde cuándo se borraron. Con la papelera vacía no pierde nada.
- **Probada** ida, vuelta e ida en `db-test`, con una tarea sembrada que se marcó como borrada antes de la vuelta: la vuelta la devolvió a la lista con título, estado y fecha intactos, y la segunda ida la dejó viva.
- **Sin claves foráneas ni valores cerrados nuevos** (convenciones 2 y 3). **Sin índice:** la lista filtra `deleted_at IS NULL` sobre cientos de filas; se añade cuando una medida lo pida.
- **Convención 6:** no se borra ni se renombra ninguna columna con datos.
- **Aplicada en desarrollo** tras las tres ejecuciones.

## Risks / Trade-offs

- **El guardarraíl de la historia no está construido.** Sin interfaz, nada pide confirmación antes de llamar a `DELETE`. Mientras tanto, el único respaldo es que lo borrado se puede restaurar.
- **Roles planos y registro abierto (PA-10):** cualquiera con sesión puede mandar a la papelera todo el tablero. Es recuperable, pero no está limitado, y nada impide *vaciarlo de vista* a la vez.
- **Sin retención ni vaciado:** la papelera solo crece. PA-2 lo deja abierto.
- **Hallazgos que no son de este change y no se tocan.** Al probarlo se vio que `GET /tasks/:id` devuelve `dueDate` como `2026-01-01T00:00:00.000Z` (el driver devuelve un `Date` para la columna `date`, y la spec habla de un día `AAAA-MM-DD`), con lo que `isOverdue` sale `false` para una fecha pasada leída de la base; y que el `404` no tiene la forma `errors[]` que documenta OpenAPI sino la de la excepción de Lucid. Los tests de la papelera comparan «antes y después por el mismo camino» y el código de estado, así que no dependen de ninguno de los dos.
