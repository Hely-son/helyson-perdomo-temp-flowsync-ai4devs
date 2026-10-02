-- Seudonimización de la copia de producción (INC-0412).
--
-- Se aplica SOLO sobre `flowsync_staging`, la base intermedia que crea
-- `make copia-produccion` (ver backend/database/copia-produccion.sh), y dentro de una
-- transacción: o queda todo o no queda nada.
--
-- Está escrito leyendo únicamente las migraciones (users, tasks). Nadie ha mirado los
-- datos para escribirlo, y por eso NO se fía de ellos:
--
--   * Lista blanca. Nada se "limpia": se construye `salida.users` y `salida.tasks`
--     nombrando una a una las columnas que viajan. Una columna que producción tenga y
--     las migraciones no (un teléfono, unas notas), o una tabla entera (`auth_access_tokens`,
--     cualquier otra), no existe en `salida` y por tanto no llega a desarrollo.
--   * Lo que cambia no depende del contenido: nombre, correo y título salen solo del `id`.
--
-- Viaja tal cual (hace falta para reproducir la incidencia):
--   ids, estados, fechas (alta, modificación, vencimiento) y `assignee_id` (quién lleva
--   cada tarea). El estado va SIN normalizar: `tasks.status` es un varchar(255) sin CHECK
--   y la incidencia casi seguro vive en un valor que no es pending, in_progress ni done.
--
-- Cambia:
--   users.full_name  -> 'Persona <id>'
--   users.email      -> 'persona-<id>' en el dominio flowsync.example (reservado, RFC 2606)
--   users.password   -> hash de PASSWORD_DEMO (`flowsync-demo`), calculado por
--                       `node ace seudonimizar:hash` y recibido en la variable de entorno
--                       DEMO_PW_HASH, igual que readonly-role.sql recibe RO_PW
--   tasks.title      -> 'Tarea <id>'   (texto libre: puede traer datos de clientes)
--
-- No viaja: auth_access_tokens (los tokens de sesión) ni nada que no esté nombrado abajo.
--
-- VERBOSITY terse: un error de psql no cita la fila que lo provocó (DETAIL/CONTEXT),
-- que aquí sería un dato real.

\set ON_ERROR_STOP on
\set VERBOSITY terse
\getenv demo_hash DEMO_PW_HASH

-- Sin hash no se hace nada: si no, todas las cuentas se quedarían sin contraseña usable.
SELECT :'demo_hash' !~ '^\$scrypt\$' AS hash_invalido \gset
\if :hash_invalido
  DO $$ BEGIN RAISE EXCEPTION 'DEMO_PW_HASH vacío o no es un hash scrypt: no se seudonimiza'; END $$;
\endif

-- Los tokens de sesión vigentes no viajan, y además no se quedan en la base intermedia.
TRUNCATE auth_access_tokens;

CREATE SCHEMA salida;

CREATE TABLE salida.users AS
SELECT
  id,
  'Persona ' || id                          AS full_name,
  'persona-' || id || '@flowsync.example'   AS email,
  :'demo_hash'::varchar                     AS password,
  created_at,
  updated_at
FROM public.users;

CREATE TABLE salida.tasks AS
SELECT
  id,
  'Tarea ' || id AS title,
  status,                    -- tal cual, sin normalizar: es lo que hay que reproducir
  assignee_id,
  created_at,
  updated_at,
  due_date
FROM public.tasks;

-- Comprobación de lo escrito, con el SQL ya aplicado y sin mirar un solo dato: si algo
-- no cuadra, aborta y la transacción entera se deshace.
DO $$
DECLARE
  n_origen int;
  n_salida int;
BEGIN
  SELECT count(*) INTO n_origen FROM public.users;
  SELECT count(*) INTO n_salida FROM salida.users;
  IF n_origen = 0 OR n_origen <> n_salida THEN
    RAISE EXCEPTION 'users: % filas de origen y % de salida', n_origen, n_salida;
  END IF;

  IF EXISTS (SELECT 1 FROM salida.users
             WHERE full_name <> 'Persona ' || id
                OR email <> 'persona-' || id || '@flowsync.example') THEN
    RAISE EXCEPTION 'users: queda algún nombre o correo sin seudonimizar';
  END IF;

  SELECT count(*) INTO n_origen FROM public.tasks;
  SELECT count(*) INTO n_salida FROM salida.tasks;
  IF n_origen <> n_salida THEN
    RAISE EXCEPTION 'tasks: % filas de origen y % de salida', n_origen, n_salida;
  END IF;

  IF EXISTS (SELECT 1 FROM salida.tasks WHERE title <> 'Tarea ' || id) THEN
    RAISE EXCEPTION 'tasks: queda algún título sin seudonimizar';
  END IF;
END $$;

-- Lo que NO viaja, solo por nombre (metadatos, no datos): tablas y columnas de producción
-- que las migraciones no conocen o que se descartan a propósito. Sirve para decidir si
-- falta algo que sí debería viajar.
SELECT table_name AS "tabla que no viaja"
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  AND table_name NOT IN ('users', 'tasks')
ORDER BY 1;

SELECT p.table_name AS tabla, p.column_name AS "columna que no viaja"
FROM information_schema.columns p
WHERE p.table_schema = 'public'
  AND p.table_name IN ('users', 'tasks')
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns s
    WHERE s.table_schema = 'salida'
      AND s.table_name = p.table_name
      AND s.column_name = p.column_name
  )
ORDER BY 1, 2;
