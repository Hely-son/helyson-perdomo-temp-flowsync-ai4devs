## Why

RF-12 se enmendó el 2026-10-02 al resolver PA-2: **borrar una tarea la manda a una papelera**, desde donde cualquier miembro del espacio puede restaurarla. Hasta ahora el producto no tenía borrado en absoluto (la API no lo ofrecía), y la historia E2-10 (`docs/backlog/E2-gestion-tareas/us-borrar-tarea.md`) estaba escrita para la papelera pero sin implementar.

La historia se escribió con más cuidado del que su tamaño sugiere: los roles son planos, cualquiera puede borrar el trabajo de cualquiera, y por eso casi todos sus criterios son guardarraíles. El más importante para el backend es **CA-8c**: lo borrado no puede salir por ningún otro camino.

## What Changes

- **Una columna, `tasks.deleted_at`** (nulable, sin valor por defecto): nulo es una tarea viva, con fecha es una tarea en la papelera desde ese momento.
- **`DELETE /api/v1/tasks/:id`** manda la tarea a la papelera. Cualquier cuenta con sesión puede borrar cualquier tarea. Responde `200` con la tarea y su `deletedAt`.
- **`GET /api/v1/tasks/trash`** lista la papelera: cada tarea con quién la llevaba y cuándo se borró, la más recientemente borrada primero.
- **`POST /api/v1/tasks/:id/restore`** la devuelve a la lista con su título, estado, responsable y vencimiento intactos.
- **Lo borrado no existe para el resto del sistema**: ni en la lista (sin filtro ni con ninguno), ni abriéndola por su identificador, ni se le puede cambiar el estado o la fecha. Se garantiza en el modelo, no ruta por ruta (ver `design.md`).
- Borrar dos veces, o restaurar lo que no está en la papelera, responde el mismo `404` de «no existe» que cualquier otra ruta, no un error nuevo.

### Fuera de alcance, y a propósito

- **Toda la interfaz.** No hay pantalla de papelera, ni botón de borrar, ni diálogo. Es un change solo de backend.
- **La confirmación explícita (CA-4, CA-5, CA-6) y la distancia entre borrar y cambiar de estado (CA-7).** Son gestos de la interfaz y no se pueden probar contra la API. **El guardarraíl que la historia llama «lo que esta historia entrega» queda sin construir** hasta que haya interfaz: la API es lo que ocurre *después* de confirmar, y por eso `DELETE` no pide nada más.
- **Vaciar la papelera.** No existe ninguna operación para borrar de verdad, y la spec lo dice. Tampoco se decide cuánto tiempo se guarda lo borrado, que PA-2 deja abierto.
- **El validador de la lista** (`listTasksValidator`) no se toca: sigue admitiendo cualquier texto como `status`. La papelera es independiente de él, porque ningún valor que llegue por ahí puede devolver una tarea borrada.
- Qué ve alguien cuya tarea abierta borra otra persona (PA-8), y si borrar debería estar limitado: la historia los deja anotados como no escribibles todavía.

## Capabilities

### New Capabilities

Ninguna. La papelera es comportamiento de las tareas, no una capability aparte.

### Modified Capabilities

- `tasks`: aparecen el borrado, la papelera y la restauración, y se fija que lo borrado no sale por ningún otro camino.

## Impact

- **Base de datos:** una migración que añade `tasks.deleted_at` (ver `## Reversibilidad` en `design.md`). Aplicada en desarrollo.
- **Backend:** modelos `Task` (hooks) y `TrashedTask`, `TasksController.destroy`, `TaskTrashController`, `TrashedTaskTransformer`, tres rutas, esquemas OpenAPI. `docs/api/openapi.json` regenerado y `docs/capabilities/tasks/README.md` al día.
- **Tests:** `backend/tests/functional/tasks/trash.spec.ts`, 17 tests.
- **Frontend:** ninguno.
