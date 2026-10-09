# comments Specification

## Purpose
Da a cada tarea un hilo de comentarios del equipo: apuntar una aclaración o una novedad junto a la tarea, sin tocar su título ni su estado, y leerlas en el orden en que se escribieron. Es lo que permite responder «¿qué se dijo sobre esto?» sin preguntar a nadie.
## Requirements
### Requirement: Comentar una tarea

El sistema SHALL crear un comentario sobre una tarea existente cuando se envíe `POST /api/v1/tasks/:id/comments` con `{"body": "..."}`, a nombre de la cuenta dueña del token, y SHALL devolver el comentario ya creado. Crear un comentario NO SHALL cambiar ningún dato de la tarea.

#### Scenario: Alta con el texto como único dato

- **WHEN** se envía `POST /api/v1/tasks/:id/comments` con `{"body": "Falta el informe del trimestre"}` y un token válido sobre una tarea que existe
- **THEN** la respuesta es `201` con `{"data": {"id": ..., "body": "Falta el informe del trimestre", "author": {"id": ..., "fullName": ..., "initials": ...}, "createdAt": ...}}`

#### Scenario: El comentario nace a nombre de quien lo envía

- **WHEN** se comenta una tarea con un token cualquiera, aunque el cuerpo incluya además un `"author"` o un `"authorId"`
- **THEN** el `author` del comentario creado es la cuenta dueña de ese token, y lo indicado en el cuerpo se ignora

#### Scenario: Comentar no cambia la tarea

- **WHEN** se comenta una tarea que tiene título, estado y responsable
- **THEN** al consultar esa tarea después, su título, su estado y su responsable son los mismos que antes del comentario

#### Scenario: Una tarea que no existe no se comenta

- **WHEN** se envía `POST /api/v1/tasks/:id/comments` con un identificador que no corresponde a ninguna tarea
- **THEN** la respuesta es `404` y no se crea ningún comentario, aunque el cuerpo fuera inválido

#### Scenario: Sin sesión no se comenta

- **WHEN** se envía `POST /api/v1/tasks/:id/comments` sin token o con un token que no es válido
- **THEN** la respuesta es `401` y no se crea ningún comentario

### Requirement: Ningún comentario vacío ni excesivo

El sistema SHALL rechazar con `422` todo comentario cuyo texto esté vacío, se componga solo de espacios o supere los 500 caracteres, sin crear nada, e SHALL ignorar los espacios sobrantes de los extremos del texto que sí acepta. Superar el máximo es un error, nunca un recorte silencioso.

#### Scenario: Texto ausente, vacío o de solo espacios

- **WHEN** se comenta una tarea con un cuerpo sin `body`, con `{"body": ""}` o con `{"body": "   "}`
- **THEN** la respuesta es `422` con un error sobre el campo `body` y no se crea ningún comentario

#### Scenario: Texto demasiado largo

- **WHEN** se comenta una tarea con un `body` de 501 caracteres
- **THEN** la respuesta es `422` con un error sobre el campo `body` y no se crea ningún comentario

#### Scenario: Los espacios de los extremos no cuentan

- **WHEN** se comenta una tarea con `{"body": "  Hecho  "}`
- **THEN** el comentario creado tiene `body` igual a `"Hecho"`, y un texto de exactamente 500 caracteres más espacios en los extremos se acepta

### Requirement: Un mismo comentario no se repite seguido

El sistema SHALL rechazar con `422` un comentario cuyo texto, una vez recortado, sea idéntico al último comentario de esa misma cuenta en esa misma tarea, para que un doble envío accidental no deje el mismo mensaje dos veces.

#### Scenario: El mismo texto dos veces seguidas

- **WHEN** una cuenta envía dos veces seguidas el mismo texto sobre la misma tarea
- **THEN** el primero responde `201`, el segundo responde `422` con un error sobre el campo `body`, y la tarea queda con un solo comentario de ese texto

#### Scenario: Lo repetido pero no seguido sí se admite

- **WHEN** una cuenta envía un texto, después otro distinto sobre la misma tarea, y después el primero otra vez
- **THEN** los tres responden `201`

#### Scenario: Otra cuenta puede decir lo mismo

- **WHEN** una cuenta envía un texto sobre una tarea y otra cuenta envía exactamente el mismo texto sobre esa misma tarea
- **THEN** los dos responden `201`

### Requirement: Leer los comentarios de una tarea

El sistema SHALL devolver los comentarios de una tarea cuando se envíe `GET /api/v1/tasks/:id/comments`, del más antiguo al más reciente, y de cada autor SHALL devolver únicamente su identificador, su nombre y sus iniciales, nunca su email.

#### Scenario: Orden de escritura

- **WHEN** se escriben tres comentarios sobre una tarea y se envía `GET /api/v1/tasks/:id/comments`
- **THEN** la respuesta es `200` con `{"data": [...]}` y los tres comentarios aparecen en el mismo orden en que se escribieron

#### Scenario: El autor no filtra datos de cuenta

- **WHEN** se lee el hilo de una tarea con comentarios
- **THEN** las claves de cada `author` son exactamente `id`, `fullName` e `initials`, y no aparece el email

#### Scenario: Una tarea sin comentarios es una lista vacía

- **WHEN** se lee el hilo de una tarea que existe y no tiene comentarios
- **THEN** la respuesta es `200` con `{"data": []}`, no un error

#### Scenario: Los comentarios son de su tarea

- **WHEN** se comentan dos tareas distintas y se lee el hilo de una de ellas
- **THEN** solo aparecen los comentarios de esa tarea

#### Scenario: Una tarea que no existe no tiene hilo

- **WHEN** se envía `GET /api/v1/tasks/:id/comments` con un identificador que no corresponde a ninguna tarea, o sin token
- **THEN** la respuesta es `404` en el primer caso y `401` en el segundo
