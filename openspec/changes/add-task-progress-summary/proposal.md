## Why

La lista del equipo responde «¿en qué anda cada uno?», pero no «¿cuánto llevamos?». Y por diseño la lista deja fuera las tareas hechas (sin filtro solo llegan las pendientes y en curso), así que quien entra no ve nunca cuánto trabajo ya está terminado. Un resumen encima del listado —cuántas de las tareas del espacio están hechas y qué porcentaje es— da esa lectura de un vistazo.

## What Changes

- La pantalla de tareas muestra, encima del listado, un resumen de progreso: el recuento de tareas en estado `done` frente al total del espacio y su porcentaje (por ejemplo, «3 de 12 hechas · 25 %»).
- El resumen cuenta **todo el espacio**, no las filas que el filtro deja a la vista. Contar solo lo visible daría siempre 0 % (vista por defecto, Pendiente, En curso) o 100 % (Hecho), porque ninguna consulta mezcla las hechas con el resto. Es una decisión tomada con el usuario al proponer el cambio.
- El resumen no aparece mientras el espacio no tenga ninguna tarea que contar.
- El resumen se mantiene al día al crear una tarea y al cambiar su estado desde la propia fila, sin recargar.
- Solo frontend: los números salen de lo que `GET /api/v1/tasks` ya devuelve (la lista por defecto y la de `status=done`). Sin endpoints nuevos, sin cambios de backend ni de esquema.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tasks`: se añade un requisito de interfaz (el resumen de progreso encima de la lista). No cambia ningún requisito existente de la API ni de la lista.

## Impact

- `frontend/src/pages/tasks-page.tsx`: carga de los dos conjuntos, mantenimiento del recuento al crear y al cambiar de estado, y pintado del resumen.
- `frontend/src/components/`: un componente nuevo para el resumen, compuesto con piezas del catálogo de `ui/`.
- `frontend/src/lib/`: la función que calcula recuento y porcentaje.
- Backend, `.adonisjs/`, OpenAPI, Postman y `docs/capabilities/tasks/README.md`: sin cambios.
- Coste en red: dos peticiones más a `GET /api/v1/tasks` al entrar en la pantalla (la lista por defecto y la de `status=done`), independientes del filtro. Con la vista por defecto una de ellas repite la que ya hace la pantalla; ver `design.md`.
