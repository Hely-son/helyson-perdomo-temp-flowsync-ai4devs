## ADDED Requirements

### Requirement: Borrar una tarea la manda a la papelera

El sistema SHALL mandar una tarea a la papelera cuando se envíe `DELETE /api/v1/tasks/:id`, y SHALL responder `200` con la tarea tal y como queda en la papelera, incluido el instante en que se borró. Cualquier cuenta con sesión SHALL poder borrar cualquier tarea, sea o no la responsable. Borrar NO SHALL quitar la tarea del sistema, NO SHALL cambiar su responsable ni su estado, y NO SHALL pedir ningún dato más que el identificador: la confirmación es un gesto de la interfaz y esta operación es lo que ocurre cuando ya se ha confirmado.

#### Scenario: Borrar una tarea

- **WHEN** se envía `DELETE /api/v1/tasks/:id` sobre una tarea viva, con un token válido
- **THEN** la respuesta es `200` con la tarea y su `deletedAt`, y la tarea deja de salir en la lista

#### Scenario: Se puede borrar una tarea ajena

- **WHEN** una cuenta borra una tarea cuyo responsable es otra cuenta
- **THEN** la tarea se borra, sin permiso especial, y sigue figurando a nombre de su responsable

#### Scenario: Desaparece para todo el equipo

- **WHEN** una cuenta borra una tarea y otra cuenta solicita después la lista
- **THEN** la tarea tampoco está para la segunda

#### Scenario: Borrar no es quitar la tarea

- **WHEN** se borra una tarea
- **THEN** sigue existiendo en la papelera con su título, estado y responsable, y no hay ninguna operación que la quite del sistema

#### Scenario: Borrar dos veces no es un error nuevo

- **WHEN** una cuenta intenta borrar una tarea que otra cuenta ya ha mandado a la papelera
- **THEN** la respuesta es `404`, igual que la de cualquier tarea que no existe, y no un error del sistema; la tarea sigue una sola vez en la papelera, con la fecha del primer borrado

#### Scenario: Borrar sin haber entrado

- **WHEN** se envía `DELETE /api/v1/tasks/:id` sin cabecera `Authorization` válida
- **THEN** la respuesta es `401` y no se borra nada

### Requirement: Lo borrado no sale por ningún otro camino

El sistema SHALL tratar una tarea que está en la papelera como inexistente para todo camino que no sea la propia papelera: NO SHALL aparecer en la lista, ni sin acotar ni acotada por ninguno de los estados; NO SHALL poder abrirse por su identificador; y NO SHALL poder cambiársele el estado ni la fecha de vencimiento. Esta garantía SHALL estar en el modelo de tarea y no en cada ruta, de modo que una ruta que se añada después la herede sin tener que acordarse de ella.

#### Scenario: No sale en la lista

- **WHEN** se solicita `GET /api/v1/tasks`, sin acotar y acotada por `pending`, por `in_progress` y por `done`, habiendo tareas borradas en cada uno de esos estados
- **THEN** ninguna de las borradas aparece en ninguna de las cuatro respuestas, y las tareas vivas sí

#### Scenario: No se abre por su identificador

- **WHEN** se solicita `GET /api/v1/tasks/:id` de una tarea borrada
- **THEN** la respuesta es `404`, la misma que para una tarea que no existe

#### Scenario: No se le puede cambiar el estado

- **WHEN** se envía `PATCH /api/v1/tasks/:id/status` sobre una tarea borrada
- **THEN** la respuesta es `404` y la tarea conserva el estado que tenía

#### Scenario: No se le puede cambiar la fecha

- **WHEN** se envía `PUT /api/v1/tasks/:id/due-date` sobre una tarea borrada
- **THEN** la respuesta es `404` y la tarea conserva la fecha de vencimiento que tenía

### Requirement: La papelera se consulta y se restaura

El sistema SHALL listar en `GET /api/v1/tasks/trash` las tareas que están en la papelera, de la más recientemente borrada a la más antigua, y SHALL acompañar cada una de quién la llevaba y de cuándo se borró. La papelera SHALL ser la misma para toda cuenta con sesión, y vacía SHALL responder `200` con una lista vacía. El sistema SHALL devolver una tarea a la lista cuando se envíe `POST /api/v1/tasks/:id/restore`, cualquier cuenta con sesión SHALL poder hacerlo, y la tarea SHALL volver con su título, estado, responsable y fecha de vencimiento intactos y dejar de estar en la papelera. Restaurar una tarea que no está en la papelera —viva o inexistente— SHALL responder `404`. El sistema NO SHALL ofrecer ninguna operación para vaciar la papelera ni para borrar de verdad una tarea.

#### Scenario: Lo borrado está en la papelera

- **WHEN** se borran dos tareas y se solicita `GET /api/v1/tasks/trash`
- **THEN** llegan las dos, la última borrada primero, cada una con su responsable y su `deletedAt`, y ninguna tarea viva

#### Scenario: La papelera vacía no es un error

- **WHEN** se solicita `GET /api/v1/tasks/trash` sin ninguna tarea borrada
- **THEN** la respuesta es `200` con una lista vacía

#### Scenario: Restaurar la devuelve tal cual

- **WHEN** una cuenta restaura una tarea que otra borró, con estado `in_progress` y una fecha de vencimiento
- **THEN** la respuesta es `200`, la tarea vuelve a la lista y a su filtro por estado con el mismo título, estado, responsable y fecha, y desaparece de la papelera

#### Scenario: Restaurar lo que no está en la papelera

- **WHEN** se envía `POST /api/v1/tasks/:id/restore` sobre una tarea viva, sobre una inexistente, o por segunda vez sobre una ya restaurada
- **THEN** la respuesta es `404` y no cambia nada

#### Scenario: Ver o restaurar sin haber entrado

- **WHEN** se solicita `GET /api/v1/tasks/trash` o se envía `POST /api/v1/tasks/:id/restore` sin cabecera `Authorization` válida
- **THEN** la respuesta es `401` y no se devuelve ni se restaura ninguna tarea

### Requirement: Borrar no es marcar como hecha

El sistema SHALL mantener como caminos distintos el estado «hecho» y el borrado: una tarea hecha SHALL salir de la vista por defecto pero seguir consultable acotando por `done`, y SHALL NOT estar en la papelera; una tarea borrada SHALL salir también del filtro `done`, SHALL estar en la papelera y SHALL conservar el estado que tenía, sin pasar a hecha.

#### Scenario: Una tarea hecha no está en la papelera

- **WHEN** se cambia el estado de una tarea a `done`
- **THEN** sale de la vista por defecto, aparece en `GET /api/v1/tasks?status=done` y no aparece en la papelera

#### Scenario: Una tarea borrada no es una tarea hecha

- **WHEN** se borra una tarea que estaba `in_progress`
- **THEN** no aparece en `GET /api/v1/tasks?status=done`, aparece en la papelera con estado `in_progress`
