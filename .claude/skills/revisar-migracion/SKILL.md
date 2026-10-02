---
name: revisar-migracion
description: Procedimiento previo a escribir cualquier migración de FlowSync. Mira el esquema real por el MCP, cuenta las filas afectadas, dice en qué rama cae, escribe el down antes que el up y prueba ida, vuelta e ida en la base de pruebas. Usar antes de crear o modificar un fichero de backend/database/migrations/.
---
# Revisar una migración antes de escribirla

Las reglas están en `docs/convenciones/base-de-datos.md` y **no se copian aquí**: este fichero solo fija el orden en que se aplican. Si una regla y esta skill se contradicen, manda el documento. Antes de empezar, léelo.

Hasta el paso 4 no se crea ningún fichero en `backend/database/migrations/`.

## 1. Mira el esquema real (convención 1)

Por el servidor MCP `dbhub` (`search_objects`, `execute_sql`), **no** por `database/schema.ts` ni por los modelos. Necesita `make db-up` y `make db-readonly` hechos.

- Tipo, nulabilidad, valor por defecto, claves y `CHECK` de las tablas y columnas que toca el cambio.
- Los valores que hay de verdad en las columnas implicadas (`SELECT col, count(*) ... GROUP BY col`), no los que el código dice que debería haber.

## 2. Cuenta las filas afectadas y di en qué rama cae (convención 5)

Si la migración mueve o transforma datos, antes de escribirla:

- Cuenta con `execute_sql` cuántas filas toca y cuántas **no encajan** con la regla nueva (por ejemplo, las que violarían un `CHECK`).
- Escribe el número y la rama en que cae, con las tres ramas que define el documento: reversible, falla en alto o pierde datos.
- Si cae en **pierde datos**, para y pide aprobación antes de seguir.

Comprueba también la convención 6: si el cambio borra o renombra una columna con datos, mira si el código la sigue usando. Si se usa en este mismo cambio, se parte en dos y esta migración no la toca.

Con la rama, el recuento y el plan de vuelta atrás, el `design` del change de OpenSpec lleva su sección `## Reversibilidad`.

## 3. Escribe el `down` antes que el `up` (convención 4)

Crea el fichero con `node ace make:migration` y rellena **primero** `down()`. Si no se puede deshacer, `down()` lo declara y explica por qué (no se deja vacío). Después se escribe `up()`.

Si hay claves foráneas nuevas, cada una declara su `ON DELETE` con el porqué al lado (convención 3), y los valores cerrados llevan `CHECK` (convención 2).

## 4. Prueba ida, vuelta e ida en la base de PRUEBAS (convención 4)

Solo contra `db-test` (puerto 54411), siempre con `NODE_ENV=test`. Nunca contra la de desarrollo (54410). Desde `backend/`:

```bash
NODE_ENV=test node ace migration:run
NODE_ENV=test node ace migration:rollback
NODE_ENV=test node ace migration:run
```

- `db-test` se vacía al pararse: si estaba parada, `make db-up` y `NODE_ENV=test node ace migration:run` para llegar al estado anterior antes de probar.
- La vuelta debe dejar el esquema como estaba antes. Compáralo por el MCP o con el diff de `database/schema.ts`.
- No uses `migration:fresh`, `migration:reset` ni `db:wipe`: el hook `.claude/hooks/sin-borrar-datos.sh` los bloquea. `migration:rollback` sí está permitido.
- Aplicar la migración a la base de desarrollo es un paso posterior y aparte, y solo cuando las tres ejecuciones han salido bien.

## Qué entregar

Un resumen corto con: lo mirado en el esquema, filas afectadas y rama, y el resultado de las tres ejecuciones.
