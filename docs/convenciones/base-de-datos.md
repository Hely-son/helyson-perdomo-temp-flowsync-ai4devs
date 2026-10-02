# Convenciones de base de datos

Fuente única de las reglas de base de datos de FlowSync. `CLAUDE.md` la importa con `@` y `openspec/config.yaml` apunta a ella: si una regla cambia, se cambia aquí y en ningún otro sitio.

Cada regla sale de algo que ya vimos en el proyecto, y el porqué va escrito al lado.

## 1. El esquema y los valores se miran en la base real, por el MCP

Antes de escribir una consulta, un filtro o una migración, se consulta la base real por el servidor MCP `dbhub` (`search_objects`, `execute_sql`). El código dice cómo se llaman las columnas, no qué hay dentro.

**Por qué.** El recuento de «tareas cerradas este mes» solo se pudo contestar bien mirando la base: `tasks.status` es un `varchar(255)` sin restricción alguna y no existe ninguna columna que diga cuándo se cerró una tarea. Ninguna de las dos cosas se ve en `database/schema.ts` ni en los modelos.

## 2. Los valores permitidos los impone la base con un CHECK

Toda columna cuyo dominio sea un conjunto cerrado de valores (estados, tipos, roles) lleva un `CHECK` en la base. El validador (VineJS) no basta: es una capa de la aplicación y se salta con un `INSERT` directo, un seeder, una factory o un script.

**Por qué.** Hoy `tasks.status` admite cualquier cadena de hasta 255 caracteres, incluida la vacía. Que solo existan `pending`, `in_progress` y `done` lo garantiza únicamente el código.

## 3. Toda clave foránea declara su ON DELETE, con el porqué al lado

Cada `references(...)` de una migración lleva `onDelete(...)` explícito y un comentario con la razón (`CASCADE`, `RESTRICT`, `SET NULL`…). Sin comportamiento por defecto implícito.

**Por qué.** Borrar un registro padre decide en silencio qué pasa con los hijos. Esa decisión es de negocio y tiene que poder leerse y discutirse en la revisión, no deducirse del SQL generado.

## 4. Toda migración lleva su `down`, probada ida, vuelta e ida en la base de PRUEBAS

- Toda migración escribe su `down`, aunque sea para declarar que no se puede deshacer y por qué.
- Se prueba **ida, vuelta e ida** (`up` → `down` → `up`) contra la base de **pruebas** (`db-test`, puerto 54411, `NODE_ENV=test`), **nunca contra la de desarrollo**.

**Por qué.** `db-test` es efímera (`tmpfs`) y se rehace con `make migrate`; la de desarrollo conserva datos y volumen. Un `down` que nunca se ha ejecutado no es un `down`.

## 5. Una migración que mueve o transforma datos cuenta antes las filas afectadas

Antes de escribirla se cuentan, contra la base **real** (por el MCP, regla 1), las filas que va a tocar, y se dice en cuál de estas tres ramas cae:

- **Reversible:** el `down` devuelve los datos exactamente a como estaban.
- **Falla en alto:** si hay filas que no encajan, la migración aborta con error y no deja nada a medias.
- **Pierde datos:** hay información que no se puede recuperar; hay que decirlo y que alguien lo apruebe.

**Por qué.** Añadir un `CHECK` sobre `tasks.status` o rellenar una columna nueva como `closed_at` depende de qué filas existen hoy. Contarlas es lo que distingue una migración segura de una que falla en producción.

## 6. Una columna con datos no se borra ni se renombra en el mismo cambio en que se deja de usar

Se hace en dos cambios distintos: primero se deja de usar la columna (el código ya no la lee ni la escribe) y se despliega; después, en otro cambio, se borra o se renombra.

**Por qué.** Mientras la columna siga en la base, volver atrás el cambio de código es gratis. Si el borrado va en el mismo cambio, un `down` no puede recuperar los datos y la versión anterior del código deja de funcionar.
