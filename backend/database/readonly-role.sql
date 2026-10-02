-- Rol de solo lectura para que un agente mire la base de desarrollo y nada más.
--
-- Se aplica con `make db-readonly`, conectado como el rol que migra (`flowsync`), y
-- se puede lanzar las veces que haga falta: cada sentencia es idempotente.
--
-- La contraseña NO está aquí. El Makefile la saca de DB_RO_PASSWORD (backend/.env) y
-- la pasa como variable de entorno del contenedor, que `\getenv` lee en la variable
-- de psql `ro_password`; así tampoco aparece en la lista de procesos. `%L` la cita
-- como literal.
--
-- Solo para la base de desarrollo (`db`). `db-test` es otro clúster y no lleva este rol.

\set ON_ERROR_STOP on
\getenv ro_password RO_PW

-- Sin contraseña no se crea nada, y se sale con error (no con éxito silencioso).
-- Si la variable ni siquiera llegó, psql falla antes, en esta misma sentencia.
SELECT :'ro_password' = '' AS sin_password \gset
\if :sin_password
  DO $$ BEGIN RAISE EXCEPTION 'DB_RO_PASSWORD vacía: no se crea el rol'; END $$;
\endif

-- El rol: puede iniciar sesión y nada más. Ningún atributo que dé poder.
SELECT format('CREATE ROLE flowsync_ro LOGIN PASSWORD %L', :'ro_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'flowsync_ro')
\gexec

-- Si ya existía se reaplica todo, también la contraseña: relanzar tras cambiarla en
-- el .env la rota.
SELECT format(
  'ALTER ROLE flowsync_ro WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
  :'ro_password'
)
\gexec

-- Conectarse a esta base (la actual) y ver el esquema `public`.
SELECT format('GRANT CONNECT ON DATABASE %I TO flowsync_ro', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO flowsync_ro;

-- Leer todas las tablas que ya existen...
GRANT SELECT ON ALL TABLES IN SCHEMA public TO flowsync_ro;

-- ...y las que se creen después. Sin esto la primera migración nueva dejaría una
-- tabla invisible para el agente. Los privilegios por defecto valen para los objetos
-- que cree el rol que ejecuta esto, y ese es el que migra: si las migraciones las
-- corriera otro rol, habría que repetir la sentencia con `FOR ROLE <ese rol>`.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO flowsync_ro;

-- Cinturón y tirantes: nada de lo que no sea SELECT, aunque alguien lo hubiera
-- concedido a mano antes. Revocar es idempotente.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM flowsync_ro;
REVOKE CREATE ON SCHEMA public FROM flowsync_ro;

-- Tablas temporales: por defecto cualquier rol puede crearlas (el permiso viene de
-- PUBLIC, así que no se puede quitar solo a este rol). Hoy el único otro rol es el
-- superusuario, al que esto no le afecta; si algún día hubiera roles de aplicación
-- con privilegios normales, habría que volver a concederles TEMPORARY.
SELECT format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database()) \gexec
