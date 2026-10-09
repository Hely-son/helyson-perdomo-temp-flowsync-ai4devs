---
name: backend-feature
description: Procedimiento obligatorio para cualquier tarea de backend de FlowSync. Explora el Requirement y el código, propone un plan con una fila por capa y se para a esperar aprobación. Después escribe los tests de contrato con el subagente test-writer, comprueba el rojo, los congela por su huella, implementa con el subagente implementer hasta el verde y cierra comprobando la base por dbhub, el contrato OpenAPI y la colección de Postman. Usar siempre que una tarea toque el backend, aunque nadie lo pida.
---
# Una funcionalidad de backend, de Requirement a verde

Este es el orden, y no se cambia: **explorar → plan → (aprobación) → tests → rojo → congelar → implementar → verde → huella intacta → cierre**. Cada paso existe porque sin él algo salió mal o solo salió bien porque alguien lo pidió así.

Rutas: `make` desde la **raíz** del repo. `node ace` solo funciona desde **`backend/`**; desde la raíz, `npm --prefix backend …`.

## 0. Antes de empezar

- Rama: la de `CLAUDE.md` («Reglas de proceso»). Si estás en `main` o en una `sN/*`, crea `feat/<slug>`. Si ya es una rama de trabajo, sigues en ella.
- Mira `git status --short` y apunta lo que ya estaba sin commitear. No es de esta tarea, y los subagentes no deben tocarlo.
- Bases: `make db-up`. Para el MCP `dbhub` hace falta además `make db-readonly`, una vez.

## 1. Explorar

- Lee el Requirement entero en `openspec/specs/<capability>/spec.md`, o en el delta del change si viene de uno. Cuenta sus Scenarios: habrá **un test por Scenario**. Si la tarea solo cubre algunos Requirements, apunta cuáles quedan fuera.
- Lee el código que toca: rutas de `start/routes.ts`, controladores, modelos, validadores y transformers de la capability, `app/openapi/schemas.ts`, factories y seeders, y los tests que ya hay en `backend/tests/`.
- Mira el esquema real por el MCP `dbhub` (`search_objects`, `execute_sql`), no por `database/schema.ts` (convención 1 de `docs/convenciones/base-de-datos.md`).
- Decide las **piezas de contrato** que los tests van a fijar y que la implementación tendrá que respetar: método y ruta, códigos de estado, forma del cuerpo y, si los tests comprueban «no se crea nada» en la base, **el nombre de la tabla y de sus columnas**. Si no se fijan ahora, quien escribe los tests y quien implementa eligen nombres distintos.

## 2. Plan, y PARA

Presenta el plan con **una fila por capa**, en este orden y sin saltarte ninguna. La capa que no haga falta se declara con su porqué, no se omite.

| Capa | Archivo | Comando del CLI (desde `backend/`) | ¿Hace falta? |
|---|---|---|---|
| Tests de contrato | `backend/tests/functional/<capability>/<nombre>.spec.ts` | `node ace make:test <capability>/<nombre> --suite=functional` | |
| Migración | `backend/database/migrations/<ts>_<nombre>.ts` | `node ace make:migration <tabla>` | |
| Modelo | `backend/app/models/<nombre>.ts` | `node ace make:model <nombre>` | |
| Factory | `backend/database/factories/<nombre>_factory.ts` | `node ace make:factory <nombre>` | |
| Seeder | `backend/database/seeders/<nombre>_seeder.ts` | `node ace make:seeder <nombre>` | |
| Validador | `backend/app/validators/<nombre>.ts` | `node ace make:validator <nombre>` | |
| Servicio | `backend/app/services/<nombre>_service.ts` | `node ace make:service <nombre>` | |
| Transformer | `backend/app/transformers/<nombre>_transformer.ts` | `node ace make:transformer <nombre>` | |
| Controlador | `backend/app/controllers/<nombre>_controller.ts` | `node ace make:controller <nombre> <acciones>` | |
| Ruta | `backend/start/routes.ts` | a mano (no hay comando) | |
| Schemas OpenAPI | `backend/app/openapi/schemas.ts` | a mano | |
| Documento OpenAPI | `docs/api/openapi.json` | `npm run openapi:generate` | |
| README | `docs/capabilities/<capability>/README.md` | a mano | |
| Copia de producción | `backend/database/copia-produccion.sh`, `seudonimizar.sql` | a mano, solo si la tabla nueva referencia `users`/`tasks` o el cambio toca sus columnas | |

Debajo de la tabla, añade:
- la lista Scenario → test;
- las piezas de contrato del paso 1;
- las decisiones abiertas que vea quien aprueba: `onDelete` de cada FK, `CHECK`, cómo sale cada 422 y si hay carreras;
- los Requirements que quedan fuera.

**Detente aquí y espera la aprobación explícita.** No lances ningún subagente ni crees ningún archivo antes. Si piden cambios, rehaz el plan y vuelve a parar.

## 3. Tests de contrato: subagente `test-writer`

Lánzalo en primer plano, porque lo siguiente depende de él. Pásale:
- la ruta del Requirement y la lista de sus Scenarios;
- la carpeta de los tests;
- las piezas de contrato del plan;
- un día de referencia literal si hace falta (`today`).

No le pases código de `backend/app/`: no puede leerlo. Al volver, lee los archivos tú: un test por Scenario, aislamiento con `withGlobalTransaction`, ningún identificador supuesto, ningún reloj. Pasa también `npx eslint` sobre ellos desde `backend/`.

## 4. Comprueba el rojo

`make test` desde la raíz. Guarda la salida y quítale los colores para leerla:

```bash
make test > <scratchpad>/rojo.txt 2>&1; sed 's/\x1b\[[0-9;]*m//g' <scratchpad>/rojo.txt | grep -E '^❯|ℹ |Tests |PASSED|FAILED' | grep -v Scanned
```

- Todos los tests nuevos tienen que fallar **y por el motivo esperado**. Enseña por qué falla cada uno (`expected 404 to equal 201`, `relation "…" does not exist`…).
- **Si alguno nace en verde, para y dilo.** No sigas. Pasa sobre todo con los tests que solo esperan 404: una ruta que no existe ya da 404. Se arregla volviendo a `test-writer` para que añada un control positivo, nunca dejándolo pasar.
- Los tests que ya existían deben seguir en verde. Si alguno estaba en rojo antes de empezar, apúntalo para no atribuírselo a esta tarea.

## 5. Congela los tests

```bash
git add backend/tests/functional/<capability>
shasum backend/tests/functional/<capability>/*.ts | tee <scratchpad>/congelados.sha
```

Enseña la huella en el chat. Esa huella es la garantía: no hay hook ni script que la sustituya. Si la sesión no tiene scratchpad, guárdala donde puedas volver a leerla y no la commitees.

## 6. Implementación: subagente `implementer`

Lánzalo en primer plano con:
- el Requirement;
- el plan aprobado entero (la tabla y las decisiones);
- la carpeta congelada;
- la lista de cambios ajenos sin commitear del paso 0.

Trabaja hasta que `make test` salga en verde.

**Disputas.** Si devuelve una, se la trasladas a quien aprobó el plan tal cual: test, archivo y línea, lo que dice el Scenario, lo que exige el test y la propuesta. No cambias el test tú, y él tampoco. Si se acepta, el test lo corrige `test-writer`, se vuelve a comprobar el rojo de ese test y se vuelve a congelar (pasos 4 y 5) antes de seguir con `implementer`.

## 7. Verde y huella intacta

```bash
shasum -c <scratchpad>/congelados.sha
git diff --stat -- backend/tests/functional/<capability>   # vacío: nada sin stagear encima de lo congelado
git status --short backend/tests                           # nada nuevo fuera de lo que ya había
make test                                                  # tú, no solo el subagente
```

Si la huella no cuadra, la implementación no se da por buena aunque esté en verde: dilo y para.

## 8. Cierre

### 8.1 La base de desarrollo, por el MCP `dbhub`

`make test` ya ha migrado también la base de desarrollo (`make migrate` migra las dos). Primero lanza el seeder, desde `backend/`: `node ace db:seed --files=database/seeders/<nombre>_seeder.ts`. Lánzalo dos veces: la segunda no debe crear nada.

Después, por `dbhub` (no por `psql`):
- `search_objects`: la tabla existe, con sus columnas, tipos, nulabilidad, claves foráneas y `CHECK`, tal como decía el plan;
- `execute_sql`: las filas que ha dejado el seeder (recuento y una muestra), iguales tras la segunda ejecución.

Si `dbhub` da permiso denegado sobre la tabla nueva, ejecuta `make db-readonly` y vuelve a intentarlo.

### 8.2 El contrato

```bash
npm --prefix backend run openapi:generate
npm --prefix backend run openapi:check
```

`openapi:check` tiene que salir 0. Si `docs/api/openapi.json` cambia, ese diff forma parte del cambio.

### 8.3 Postman

Carga las herramientas del MCP `postman` con ToolSearch (consulta `postman`). Antes de mandar nada, revisa que `docs/api/openapi.json` no lleva correos fuera de `example.com` ni claves: subirlo es publicarlo fuera del proyecto. Después:

1. Busca el workspace `FlowSync`; si no existe, créalo.
2. Busca en él la spec de la API (nombre `FlowSync API`):
   - si existe, actualiza su contenido con `docs/api/openapi.json` y sincroniza con ella la colección que se generó de esa spec;
   - si no existe, créala con ese contenido (OpenAPI, JSON) y genera la colección a partir de ella.
3. Apunta los nombres o identificadores del workspace, la spec y la colección.

Si las herramientas de `postman` no están cargadas, no responden o devuelven error, dilo en el informe con el error y sigue: Postman no bloquea el cierre.

### 8.4 Informe final

- Tabla capa → archivo → comando con que se creó, incluidas las capas declaradas como innecesarias.
- Tabla Scenario → estado en rojo (con el motivo) → estado en verde.
- La huella: `shasum -c` en OK.
- Lo visto por `dbhub` (tabla, columnas, filas del seeder), el resultado de `openapi:check` y el de Postman.
- Disputas, decisiones abiertas y todo lo que se hizo fuera del plan.

Esta skill **no hace commit**. El commit, el PR y el `adversarial-reviewer` siguen las «Reglas de proceso» de `CLAUDE.md`.

## Lo que ya se aprendió haciéndolo

- **`node ace` solo desde `backend/`**, `make` desde la raíz. `npm --prefix backend …` sirve desde la raíz.
- **El registro de rutas se queda viejo** justo después de crear un controlador. Si `make test` falla al arrancar, se ejecuta **una vez** `npm --prefix backend test`, que regenera `.adonisjs/`, y se vuelve a `make test`.
- **`make test` migra también desarrollo.** No hace falta migrar aparte para el cierre, pero hay que saberlo: una migración rota llega a desarrollo con el primer `make test`.
- **Los tests que solo esperan 404 nacen en verde**, porque la ruta todavía no existe. Necesitan un control positivo.
- **Sin endpoint de lectura no se puede comprobar por HTTP «no se crea nada».** Se usan las aserciones `db.assertCount`, `db.assertHas`, `db.assertMissing` y `db.assertEmpty` del plugin `dbAssertions`. Por eso el nombre de la tabla y de las columnas es contrato y se fija en el plan.
- **404 gana a 422**: el controlador busca el recurso padre antes de validar el cuerpo.
- **201 con cuerpo**: `response.status(201)` y después `return serialize(...)`. `response.created(serialize(...))` deja el cuerpo vacío.
- **Un 422 de regla de negocio** se lanza con `errors.E_VALIDATION_ERROR` de `@vinejs/vine`, para que tenga la misma forma que los de VineJS.
- **Las columnas `date` llegan como `Date`** del driver de PostgreSQL aunque `schema.ts` diga `string`. Comparadas con `<` contra un texto dan siempre `false`, y serializadas salen como instante (`…T00:00:00.000Z`). Ya pasó con `isOverdueOn`.
- **`db:seed` ejecuta los seeders por orden alfabético.** Un seeder nuevo que necesite personas o tareas lanza antes `main_seeder` en vez de crear las suyas.
- **Una tabla nueva con FK a `users` o `tasks` rompe el `TRUNCATE` de `copia-produccion.sh`.** Hay que revisarlo en el mismo cambio. El hook `sin-borrar-datos.sh` bloquea `TRUNCATE` incluso en `db-test`, así que ese arreglo puede quedar sin ejecutar: dilo, no esquives el hook.
- **El rollback solo se prueba en `db-test`** (`NODE_ENV=test`), nunca en desarrollo.
- **Los subagentes escriben con formato que eslint puede rechazar.** Pasa `npx eslint` sobre los tests antes de congelarlos: después ya no se pueden tocar.
- **La salida de Japa lleva códigos de color.** Quítalos con `sed` antes de buscar en ella.
