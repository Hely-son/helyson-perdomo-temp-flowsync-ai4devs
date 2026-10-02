## 1. Base de datos

- [x] 1.1 Mirar el esquema real de `tasks` por el MCP y contar las filas afectadas (230, 0 modificadas) — rama: reversible
- [x] 1.2 Migración `add_deleted_at_to_tasks_table`: `down` primero, `deleted_at` nulable sin valor por defecto
- [x] 1.3 Probar ida, vuelta e ida en `db-test`, con una tarea en la papelera durante la vuelta
- [x] 1.4 Aplicar en la base de desarrollo y comprobar por el MCP que la columna existe y las 230 tareas siguen vivas

## 2. Modelo

- [x] 2.1 Hooks `before:find` y `before:fetch` en `Task` que excluyen lo borrado (decisión 2)
- [x] 2.2 `TrashedTask`: la misma tabla con el filtro invertido, solo para listar y restaurar
- [x] 2.3 Estado `borrada` en `TaskFactory` y corregir su comentario, que decía que no había papelera

## 3. API

- [x] 3.1 `DELETE /tasks/:id` → `TasksController.destroy`
- [x] 3.2 `GET /tasks/trash` y `POST /tasks/:id/restore` → `TaskTrashController`, con `trash` declarada antes de `:id`
- [x] 3.3 `TrashedTaskTransformer` y los esquemas OpenAPI `TrashedTask*`
- [x] 3.4 `npm run openapi:generate` y commitear el diff de `docs/api/openapi.json` y de `.adonisjs/`
- [x] 3.5 Actualizar `docs/capabilities/tasks/README.md`

## 4. Tests

- [x] 4.1 Un test por criterio probable en la API: CA-1, CA-2, CA-3, CA-8, CA-8b, CA-8c, CA-9, CA-10, CA-11
- [x] 4.2 CA-8c ruta por ruta: lista sin filtro y con los tres, tarea suelta, cambio de estado, cambio de fecha, y el mecanismo del modelo
- [x] 4.3 Comprobar que los tests protegen: sin el hook fallan 11 de 17
- [x] 4.4 Lint, formato, typecheck y la suite entera en verde (40 tests)

## 5. Fuera de este change

- [ ] 5.1 La interfaz: pantalla de la papelera, botón de borrar, y la confirmación de CA-4, CA-5, CA-6 y CA-7
- [ ] 5.2 Vaciar la papelera y decidir cuánto se guarda lo borrado (lo que PA-2 deja abierto)
- [ ] 5.3 Archivar este change y sincronizar la spec viva (`openspec/specs/tasks/spec.md`)
