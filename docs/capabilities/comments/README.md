# Capability: `comments`

El hilo de comentarios de cada tarea: apuntar una aclaración o una novedad junto a la tarea, sin tocar
su título ni su estado.

> **Dónde está la verdad.** Las reglas de esta capability viven en
> **[`openspec/specs/comments/spec.md`](../../../openspec/specs/comments/spec.md)** —4 requisitos, 16
> scenarios— y este README **no las repite**: enlaza a cada una y dice dónde está implementada. Lo que
> sí describe de primera mano es lo que se lee del código: qué ruta existe, qué acepta y cómo se
> arranca y se prueba en local. Si algo de aquí y la spec no concuerdan, manda la spec
> (ver [ADR 0001](../../adr/0001-openspec-como-fuente-de-verdad.md)).

## Endpoints

Bajo `/api/v1`, declarado en [`backend/start/routes.ts`](../../../backend/start/routes.ts) dentro del
grupo `tasks`, que exige `Authorization: Bearer <token>` (`.use(middleware.auth())`). El token sale de
`POST /api/v1/auth/login` o de `POST /api/v1/auth/signup`.

| Método y ruta | Entrada | Controlador | Devuelve |
|---|---|---|---|
| `GET /tasks/:id/comments` | — | [`TaskCommentsController.index`](../../../backend/app/controllers/task_comments_controller.ts) | `200` · el hilo, del más antiguo al más reciente |
| `POST /tasks/:id/comments` | `{ "body": "..." }` | [`TaskCommentsController.store`](../../../backend/app/controllers/task_comments_controller.ts) | `201` · el comentario creado |

Toda respuesta va envuelta en `{ "data": ... }` por el serializer de
[`providers/api_provider.ts`](../../../backend/providers/api_provider.ts).

Códigos del `GET`, en el orden en que se deciden (no hay `422`: no lee cuerpo ni query):

1. `401` — falta el token o no es válido.
2. `404` — no hay ninguna tarea viva con ese `id`: no existe o está en la papelera. Los comentarios de
   una tarea borrada no se pierden: el hilo vuelve entero al restaurarla.
3. `200` — el hilo entero, sin paginación, ordenado por `id` ascendente (el orden de escritura). Una
   tarea sin comentarios da `{ "data": [] }`, no un error. Cualquier cuenta con sesión lee el hilo de
   cualquier tarea viva.

Códigos del `POST`, en el orden en que se deciden:

1. `401` — falta el token o no es válido.
2. `404` — no hay ninguna tarea viva con ese `id` (no existe o está en la papelera). Se mira **antes**
   que el cuerpo: un cuerpo inválido sobre una tarea que no existe es `404`, no `422`.
3. `422` — el `body` falta, está vacío, es solo espacios o pasa de 500 caracteres (reglas de VineJS:
   `required`, `minLength`, `maxLength`), o repite el último comentario de la misma cuenta en esa
   tarea (regla `notRepeated`). Siempre con la forma de los errores de VineJS:
   `{ "errors": [{ "field": "body", "message": "...", "rule": "..." }] }`.
4. `201` — creado.

### El comentario

[`CommentTransformer`](../../../backend/app/transformers/comment_transformer.ts):

```json
{ "id": 1, "body": "Falta el informe del trimestre",
  "author": { "id": 1, "fullName": "Ada Lovelace", "initials": "AL" },
  "createdAt": "..." }
```

No lleva `taskId` (se pide colgado de su tarea) ni `updatedAt` (un comentario no se edita). El
`author` sale por
[`TaskAssigneeTransformer`](../../../backend/app/transformers/task_assignee_transformer.ts), el mismo
que recorta al responsable de una tarea a `id`, `fullName` e `initials` —nunca el email—. Se reutiliza
porque hoy es exactamente esa forma; si el responsable llegara a necesitar un dato más, el autor no
debe heredarlo y habría que separarlos.

### El contrato, servido

Las dos operaciones están anotadas con los decoradores de `@foadonis/openapi` sobre el controlador, y
sus formas (`Comment`, `CommentResponse`, `CommentListResponse`, `CreateCommentBody`) viven en
[`backend/app/openapi/schemas.ts`](../../../backend/app/openapi/schemas.ts), junto a las de `tasks`. El
documento se sirve en **`/api.json`** (interfaz en `/api`) y su copia versionada es
[`docs/api/openapi.json`](../../api/openapi.json): `npm run openapi:generate` la reescribe y
`npm run openapi:check` falla si no coincide con el código.

## Reglas de negocio: dónde vive cada una

| Área | Implementada en | Requisito que manda |
|---|---|---|
| Comentar con el texto como único dato | `createCommentValidator` · [`validators/comment.ts`](../../../backend/app/validators/comment.ts) y `TaskCommentsController.store` | [Comentar una tarea](../../../openspec/specs/comments/spec.md#requirement-comentar-una-tarea) |
| El autor es quien envía, no lo que diga el cuerpo | `auth.getUserOrFail()` en el controlador; el validador solo declara `body` | [Comentar una tarea](../../../openspec/specs/comments/spec.md#requirement-comentar-una-tarea) |
| Comentar no cambia la tarea | `CommentService.create` solo inserta en `comments`; la tarea se bloquea, no se guarda | [Comentar una tarea](../../../openspec/specs/comments/spec.md#requirement-comentar-una-tarea) |
| Tarea inexistente o en la papelera: `404` antes que `422` | `Task.findOrFail` antes de `validateUsing` en el controlador (`Task` esconde la papelera) | [Comentar una tarea](../../../openspec/specs/comments/spec.md#requirement-comentar-una-tarea) |
| Ni vacío, ni solo espacios, ni más de 500 | `createCommentValidator`, con `trim()` antes de `minLength(1)` y `maxLength(500)`. **Y en la base**: CHECK `comments_body_check` (recortado y entre 1 y 500), para lo que no pasa por el validador | [Ningún comentario vacío ni excesivo](../../../openspec/specs/comments/spec.md#requirement-ningún-comentario-vacío-ni-excesivo) |
| No repetir seguido | [`CommentService.create`](../../../backend/app/services/comment_service.ts): compara con el último comentario **de esa cuenta en esa tarea**, desempatado por `id`, y lanza `E_VALIDATION_ERROR` de VineJS. Bloquea la fila de la tarea (`FOR UPDATE`) para que dos envíos simultáneos no pasen los dos | [Un mismo comentario no se repite seguido](../../../openspec/specs/comments/spec.md#requirement-un-mismo-comentario-no-se-repite-seguido) |
| Leer el hilo | `TaskCommentsController.index`: `Task.findOrFail` (la papelera es `404`), después los comentarios de esa tarea ordenados por `id` ascendente —el mismo desempate que usa `CommentService.create` para decidir «el último», porque dos comentarios pueden compartir `created_at` y el `id` no se repite—. El autor sale por `TaskAssigneeTransformer` (`id`, `fullName`, `initials`) | [Leer los comentarios de una tarea](../../../openspec/specs/comments/spec.md#requirement-leer-los-comentarios-de-una-tarea) |

### En la base de datos

Tabla `comments` (migración
[`create_comments_table`](../../../backend/database/migrations/1791563239402_create_comments_table.ts)):
`id`, `task_id`, `author_id`, `body` (`text` con el CHECK de arriba) y `created_at`. Índice
`(task_id, author_id, id)` para la regla del repetido.

- `task_id` → `tasks`, **`ON DELETE CASCADE`**. Mandar una tarea a la papelera no borra la fila, así
  que sus comentarios se quedan y vuelven con ella al restaurarla. Solo un borrado real de la fila se
  los lleva.
- `author_id` → `users`, **`ON DELETE CASCADE`**, igual que `tasks.assignee_id`. No hay ruta que borre
  cuentas.

`make copia-produccion` vacía `comments` junto con `users`, `tasks` y `auth_access_tokens` (cuelgan de
ellas y la copia no trae comentarios): ver
[`copia-produccion.sh`](../../../backend/database/copia-produccion.sh).

## Cómo se prueba en local

### Tests automáticos

```bash
make test                                       # desde la raíz: migra las dos bases y corre todo
cd backend && node ace test --files=comments/   # solo los de esta capability (16)
```

Los tests están en [`backend/tests/functional/comments/`](../../../backend/tests/functional/comments/),
un test por scenario: `create.spec.ts` (5), `body.spec.ts` (3), `repeated.spec.ts` (3) y
`list.spec.ts` (5). Los tres primeros miran lo guardado directamente en la tabla `comments` porque se
escribieron antes de que existiera el `GET`; `list.spec.ts` va solo por HTTP (crea la tarea, comenta y
lee el hilo por la API, sin mirar la base).

### Datos de desarrollo

[`CommentFactory`](../../../backend/database/factories/comment_factory.ts) y
[`comment_seeder.ts`](../../../backend/database/seeders/comment_seeder.ts). El seeder deja 18
comentarios en las 8 primeras tareas del equipo de `main_seeder`; si no existen todavía, lanza antes
`main_seeder` (idempotente) para crearlas. Lanzarlo dos veces no duplica nada.

```bash
make seed                                                   # todos los seeders
cd backend && node ace db:seed --files=database/seeders/comment_seeder.ts   # solo este
```

### A mano, contra el servidor real

```bash
node ace serve --hmr        # http://localhost:3333
```

```bash
# 1. Una cuenta, su token y una tarea
TOKEN=$(curl -s -X POST http://localhost:3333/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['token'])")
curl -s -X POST http://localhost:3333/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Revisar el informe"}'

# 2. Comentar — 201, con el texto recortado
curl -s -X POST http://localhost:3333/api/v1/tasks/1/comments \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"body":"  Falta el informe del trimestre  "}'

# 3. Lo mismo otra vez — 422 sobre body (regla notRepeated)
curl -s -X POST http://localhost:3333/api/v1/tasks/1/comments \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"body":"Falta el informe del trimestre"}'

# 4. Leer el hilo — 200, del más antiguo al más reciente
curl -s http://localhost:3333/api/v1/tasks/1/comments \
  -H "Authorization: Bearer $TOKEN"
```

Ojo: esto **escribe en la base de datos de desarrollo**.

### Antes de dar algo por terminado

```bash
cd backend && npm run lint && npm run typecheck && npm run openapi:check && node ace test
```
