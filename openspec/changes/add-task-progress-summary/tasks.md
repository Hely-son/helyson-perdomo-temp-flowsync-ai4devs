## 1. Cálculo (funciones puras)

- [x] 1.1 Añadir en `frontend/src/lib/` el tipo del recuento (`{ open, done }`) y la función que calcula el porcentaje entero hacia abajo (`Math.floor`), con `total = open + done`
- [x] 1.2 Añadir la función del delta: dado un recuento, el estado de origen y el de destino, devuelve el recuento nuevo (mueve 1 entre `open` y `done` solo si se cruza la frontera de `done`; no cambia entre `pending` e `in_progress`)
- [x] 1.3 Comprobar a mano las dos funciones con los casos del spec (3/12 → 25 %, 4/12 → 33 %, 3/13 → 23 %, 199/200 → 99 %, 5/5 → 100 %, 0/5 → 0 %) desde un script desechable fuera del repo

## 2. Componente del resumen

- [x] 2.0 Traer la barra del catálogo con `npx shadcn@latest add progress` (desde `frontend/`), sin editar el archivo generado
- [x] 2.1 Crear `frontend/src/components/task-progress.tsx`: recibe el recuento `{ open, done }`, pinta «X de Y hechas · Z %» con `role="status"` y `aria-live="polite"` y debajo la barra `Progress` con ese porcentaje, con tokens del tema salvo el relleno de la barra, que va en `bg-blue-600` por petición expresa (desviación declarada en un comentario del componente)
- [x] 2.2 Respetar la pluralización del texto con una sola tarea («1 de 1 hecha»)

## 3. Integración en la pantalla de tareas

- [x] 3.1 En `frontend/src/pages/tasks-page.tsx`, añadir el estado del resumen (`null` al inicio) y un efecto que dependa solo de `token` y cargue `listTasks(token)` y `listTasks(token, 'done')`; si cualquiera falla, el resumen queda en `null` sin tocar `loadError`
- [x] 3.2 Ajustar el resumen con el delta al crear una tarea (`pending`), ignorando el ajuste mientras el resumen es `null`
- [x] 3.3 Ajustar el resumen en `handleChangeStatus`: delta al aplicar el cambio optimista y delta inverso en la vuelta atrás si el servidor lo rechaza
- [x] 3.4 Pintar `TaskProgress` encima del listado (entre el filtro y las alertas/lista) solo si el resumen no es `null` y `total > 0`
- [x] 3.5 Comprobar que `doneCount` y los cuatro finales de lista vacía no cambian de comportamiento

## 4. Verificación y cierre

- [x] 4.1 `cd frontend && npm run build` (typecheck) y `npm run lint` en verde
- [ ] 4.2 Comprobar en el navegador cada escenario de `specs/tasks/spec.md`: filtros que no mueven el resumen, todo hecho con la vista por defecto vacía, espacio sin tareas, crear, marcar hecho, sacar de hecho, pasar entre pendiente y en curso, fallo del servidor al cambiar de estado y fallo al cargar el resumen
- [x] 4.3 Confirmar que no se ha tocado `backend/`, `.adonisjs/`, OpenAPI ni Postman
- [ ] 4.4 Cerrar con `/commit` y, al terminar la unidad de trabajo, abrir el PR con `gh pr create` y pasar el subagente `adversarial-reviewer`
