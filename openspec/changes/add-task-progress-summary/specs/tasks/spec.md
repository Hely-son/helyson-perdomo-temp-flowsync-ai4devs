## ADDED Requirements

### Requirement: El progreso del espacio, encima de la lista

La interfaz SHALL mostrar encima del listado de la pantalla de tareas cuántas de las tareas del espacio están en estado `done`, como recuento sobre el total y como porcentaje (por ejemplo, «3 de 12 hechas · 25 %»). El resumen SHALL contar todas las tareas del espacio, tenga la lista el filtro que tenga, y NO SHALL calcularse sobre las filas que el filtro deja a la vista: ninguna vista mezcla las hechas con el resto, así que ese cálculo daría siempre 0 % o 100 %. El porcentaje SHALL ser un número entero redondeado hacia abajo, de modo que solo valga 100 % cuando todas las tareas estén hechas. El resumen NO SHALL mostrarse cuando el espacio no tiene ninguna tarea, y NO SHALL presentarse como un error ni bloquear la lista si no se ha podido calcular.

#### Scenario: Espacio con tareas hechas y abiertas

- **WHEN** una persona con sesión abierta entra en la lista de un espacio con 12 tareas, 3 de ellas hechas y 9 pendientes o en curso
- **THEN** encima del listado se lee que 3 de 12 tareas están hechas y que es el 25 %

#### Scenario: El filtro no cambia el resumen

- **WHEN** se acota la lista por «Hecho», por «En curso» o se vuelve a la vista por defecto, en ese mismo espacio de 12 tareas con 3 hechas
- **THEN** el resumen sigue diciendo 3 de 12 y 25 % en los tres casos

#### Scenario: Ninguna tarea hecha

- **WHEN** se entra en la lista de un espacio con 5 tareas, ninguna hecha
- **THEN** el resumen se muestra con 0 de 5 y 0 %, en lugar de ocultarse

#### Scenario: Todo hecho

- **WHEN** se mira la lista de un espacio en el que las 5 tareas existentes están hechas
- **THEN** el resumen dice 5 de 5 y 100 %, aunque la vista por defecto no tenga ninguna fila y muestre el mensaje de que no queda nada pendiente

#### Scenario: El porcentaje no redondea hacia el 100 %

- **WHEN** el espacio tiene 200 tareas y 199 están hechas
- **THEN** el porcentaje que se muestra es 99 % y no 100 %

#### Scenario: Espacio sin tareas

- **WHEN** se entra en la lista de un espacio en el que no se ha creado ninguna tarea
- **THEN** no se muestra el resumen, y sí la explicación del espacio vacío

#### Scenario: Marcar como hecho actualiza el resumen

- **WHEN** se marca como «Hecho» desde su fila una tarea pendiente, estando el resumen en 3 de 12
- **THEN** el resumen pasa a 4 de 12 y 33 % al momento, sin recargar la página

#### Scenario: Sacar una tarea de hecho actualiza el resumen

- **WHEN** se cambia a «Pendiente» o «En curso» una tarea que estaba en «Hecho», estando el resumen en 4 de 12
- **THEN** el resumen pasa a 3 de 12 y 25 % al momento

#### Scenario: Pasar entre pendiente y en curso no lo mueve

- **WHEN** se cambia una tarea de «Pendiente» a «En curso»
- **THEN** el resumen no cambia

#### Scenario: Crear una tarea actualiza el resumen

- **WHEN** se crea una tarea estando el resumen en 3 de 12
- **THEN** el resumen pasa a 3 de 13 y 23 % al momento, porque toda tarea nace pendiente

#### Scenario: Un cambio de estado que falla no deja el resumen mintiendo

- **WHEN** se marca una tarea como «Hecho» y el servidor rechaza el cambio
- **THEN** la fila vuelve a su estado real y el resumen vuelve al valor que tenía antes del intento

#### Scenario: No se ha podido calcular

- **WHEN** falla la consulta de la que sale el resumen
- **THEN** el resumen no se muestra, no se pinta ningún número inventado, y la lista sigue funcionando y mostrando sus propios errores como hasta ahora
