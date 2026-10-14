# Revisor de Claude en CI

[`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml) lanza un revisor de
código sobre cada PR (al abrirlo, en cada push nuevo, al reabrirlo y al sacarlo de borrador) usando la
acción oficial [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action).
Los hallazgos llegan como comentarios en el PR: uno en línea por hallazgo sobre la línea afectada y un
resumen al final.

El workflow está commiteado, pero **no funciona hasta que se completen los pasos de abajo**.

## Pasos manuales pendientes

1. **Instalar la GitHub App de Claude** en el repositorio: <https://github.com/apps/claude>. Tiene que
   hacerlo un owner de la organización. El workflow pide `id-token: write` porque la acción cambia el
   token OIDC del job por un token de esa app, y con él publica los comentarios como `claude[bot]`. Sin
   la app instalada, ese intercambio falla.
2. **Crear el secreto de la credencial** en *Settings → Secrets and variables → Actions → New
   repository secret*. Hay que elegir uno de los dos caminos de la [sección de abajo](#la-credencial),
   y el nombre del secreto tiene que ser exactamente el que se indica allí.
3. **Escribir el archivo de calibración `REVIEW.md`** en la raíz del repo. El prompt le pide al
   revisor que lo lea primero, si existe, para saber qué cuenta como hallazgo y con qué severidad. Hoy
   no existe, así que el revisor solo se guía por `CLAUDE.md` y las specs de `openspec/specs/`.
4. **Que Actions vuelva a ejecutarse en la organización.** A fecha de este documento, la organización
   LIDR-academy está marcada por GitHub («The LIDR-academy organization has been flagged») y los
   workflows de los PRs no llegan a lanzarse. Mientras siga así, ni este job ni `openapi:check`
   corren. Se resuelve con el enlace *contact support* del aviso, y también tiene que hacerlo un owner.
5. **Comprobar la primera ejecución.** Una vez hechos los pasos 1–4, el primer PR que se abra o
   actualice debería tener un check *Revisión de Claude* y los comentarios de `claude[bot]`. Si el job
   sale en verde pero no hay comentarios, el registro de la ejecución dice por qué.

Atajo para los pasos 1 y 2: desde Claude Code, en local, `/install-github-app` instala la app y crea el
secreto en un mismo flujo.

## La credencial

La acción acepta dos credenciales distintas, cada una en **su propia entrada**. No son intercambiables.

### 1. Suscripción (Pro o Max) — la que usa el workflow tal y como está

- **Cómo se obtiene:** en local, con la sesión de tu suscripción iniciada, ejecuta `claude setup-token`.
  Genera un token OAuth de larga duración, que empieza por `sk-ant-oat`.
- **Entrada de la acción:** `claude_code_oauth_token`.
- **Nombre del secreto:** `CLAUDE_CODE_OAUTH_TOKEN`.

```yaml
claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

El uso se descuenta de los límites de tu plan y no se factura aparte. El token va ligado a tu cuenta:
si lo revocas o cambias de plan, el revisor deja de funcionar.

### 2. Clave de API de la consola

- **Cómo se obtiene:** en <https://platform.claude.com/settings/keys>. Empieza por `sk-ant-api`.
- **Entrada de la acción:** `anthropic_api_key`.
- **Nombre del secreto:** `ANTHROPIC_API_KEY`.

```yaml
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Para usar este camino, sustituye en el workflow la línea de `claude_code_oauth_token` por la de arriba.
Deja solo una de las dos. Este uso se factura por tokens a la organización de la consola.

### No las cruces

Un token de `setup-token` en `anthropic_api_key`, o una clave de API en `claude_code_oauth_token`,
**falla en la primera llamada al modelo con un error de autenticación que no dice por qué**. Lo mismo
pasa si el nombre del secreto no coincide con el que lee el workflow: `${{ secrets.X }}` de un secreto
inexistente se convierte en una cadena vacía, no en un error. Si el job falla al autenticar, revisa
primero estas tres cosas: qué credencial es (`sk-ant-oat` o `sk-ant-api`), en qué entrada está y cómo
se llama el secreto.

## En qué se va el dinero

Todo el gasto está en las llamadas al modelo del revisor. Lo fija `claude_args` en el workflow:

```yaml
claude_args: |
  --model sonnet --effort medium
  --max-turns 40
```

- **Modelo: `sonnet`.** Es un alias que apunta a la última versión de Sonnet. Revisar un diff es leer
  código y razonar sobre él, y Sonnet lo hace bien a una fracción del coste de Opus. Además, el job
  corre en cada push a cada PR, así que el coste por ejecución se multiplica rápido.
- **`--effort medium`.** Limita cuánto razona el modelo antes de responder. Menos razonamiento consume
  menos tokens.
- **`--max-turns 40`.** Es el techo de idas y vueltas del agente: cada lectura, cada `gh pr diff` y cada
  comentario cuenta. Si se alcanza, la revisión se corta donde esté.
- **`timeout-minutes: 10`.** Es el techo de reloj del job. Acota los minutos de runner y, de rebote, el
  gasto de un revisor atascado.

**Cómo cambiarlo:** edita esa línea de `claude_args`.

- `--model opus` da una revisión más profunda y cara; `--model haiku` una más barata y superficial.
  También se puede usar un identificador de modelo completo para fijar una versión concreta en vez de
  seguir al alias.
- `--effort low` o `--effort high` cambian cuánto razona el modelo.
- Subir `--max-turns` deja llegar más lejos en PRs grandes, a cambio de más gasto por ejecución.

**Precios:** no se citan aquí porque cambian.

- Clave de API: <https://platform.claude.com/docs/en/about-claude/pricing>, coste por millón de tokens según el modelo.
- Suscripción: <https://claude.com/pricing>, planes y sus límites de uso.

## PRs desde un fork en un repositorio público

GitHub no pasa los secretos del repositorio a un workflow `pull_request` disparado desde un fork, y le
da un `GITHUB_TOKEN` de solo lectura sin permiso para pedir el token OIDC. Además, en un repo público,
la primera ejecución de quien contribuye por primera vez espera a que un mantenedor la apruebe. Y la
acción rechaza a autores sin permiso de escritura en el repositorio. Con todo eso, el revisor no podría
ni autenticarse ni comentar.

Por eso el job lleva esta condición:

```yaml
if: github.event.pull_request.head.repo.full_name == github.repository
```

Un PR desde un fork **se salta**: el check aparece como *skipped*, no en rojo.

Lo que **no** hay que hacer para cubrir los forks es pasar a `pull_request_target`. Ese evento sí da
acceso a los secretos, pero junto con código y texto que escribe un tercero. Basta un prompt injection
en el PR para que el revisor actúe con tu credencial. Si hace falta revisar un PR externo, que un
mantenedor suba la rama al repo principal y abra el PR desde ahí, o que lo revise en local.
