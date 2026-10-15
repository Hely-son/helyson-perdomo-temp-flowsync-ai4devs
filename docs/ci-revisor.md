# Revisor de Claude en CI

[`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml) lanza
[`anthropics/claude-code-action@v1`](https://github.com/anthropics/claude-code-action) en cada PR
(al abrirlo, en cada push, al reabrirlo y al pasar de borrador a listo). El revisor lee el diff con
`gh`, abre los archivos con Read, Grep y Glob y publica los hallazgos como comentarios en el PR: uno
en línea por hallazgo y uno general de cierre. Sus criterios salen de
[`.claude/agents/adversarial-reviewer.md`](../.claude/agents/adversarial-reviewer.md).

## Pasos manuales pendientes

Nada de esto lo puede hacer un commit:

1. **Instalar la GitHub App de Claude** en el repositorio: <https://github.com/apps/claude>. Hace
   falta ser admin del repo. Con ella la acción publica los comentarios como `claude[bot]`.
   Alternativa: `/install-github-app` desde Claude Code, que instala la app y crea el secreto.
2. **Crear el secreto de la credencial** en *Settings → Secrets and variables → Actions*, con el
   nombre exacto que pide el camino elegido (ver [Credencial](#credencial)).
3. **Mergear el workflow en `main` antes de esperar una revisión.** La acción comprueba que el
   workflow sea idéntico al de la rama por defecto, y si no lo es se salta con el aviso *«Action
   skipped due to workflow validation error»*. Así que el PR que añade este archivo no se revisa a sí
   mismo, y tampoco se revisa ningún PR posterior que lo modifique.
4. **Comprobar que Actions puede ejecutar acciones de terceros** (`anthropics/*`, `actions/*`) si la
   organización lo restringe, en *Settings → Actions → General*.
5. **Decidir si el revisor de CI tiene su propia calibración.** Hoy no hay un archivo específico: el
   prompt apunta a `.claude/agents/adversarial-reviewer.md`. Si se quiere uno distinto, se crea y se
   cambia el paso 1 del prompt. Y una advertencia: el checkout es el del PR, así que un PR que edite
   ese archivo (o `CLAUDE.md`) cambia los criterios con los que se revisa a sí mismo.

## En qué se va el dinero

Cada ejecución es una sesión de Claude Code, y se lanza una por cada push al PR. Lo que la encarece
es leer: el diff, los archivos que abre y los scenarios de `openspec/specs/`.

**Modelo: `--model sonnet --effort medium`.** Revisar es sobre todo leer muchos archivos y contrastar
el código con la spec, sin escribir código. Sonnet hace eso bien con un coste por token menor que el
de Opus. Haiku es más barato aún, pero tiene menos margen para razonar sobre varios archivos a la vez.
`--effort medium` limita cuánto razona antes de responder, y ese razonamiento también se paga como
tokens.

**Cotas.** Estos límites acotan el gasto, no lo fijan:

- `--max-turns 40`: al llegar al límite, Claude Code termina con error y el job sale en rojo. Los
  comentarios ya publicados se quedan; por eso el prompt pide publicar cada hallazgo en cuanto se
  confirme. Cada llamada denegada (un comando fuera de `--allowedTools`, una redirección a fichero)
  gasta uno de esos turnos sin aportar nada.
- `timeout-minutes: 10`: GitHub mata el job a los diez minutos, haya terminado o no. En repositorios
  privados esos minutos de Actions también cuentan.
- `concurrency` con `cancel-in-progress`: un push nuevo cancela la revisión del push anterior.
- Además, la acción clasifica con Haiku los comentarios en línea antes de publicarlos
  (`classify_inline_comments`, activado por defecto). Es una llamada pequeña, pero se suma.

**Quién paga** depende de la credencial. Con token de suscripción, el consumo sale de los límites
del plan de quien generó el token ([planes](https://claude.com/pricing)). Con clave de API, se paga
por token en la consola ([precios de la API](https://platform.claude.com/docs/en/about-claude/pricing)).
Este documento enlaza los precios en vez de citarlos porque cambian.

**Cómo cambiarlo:** en `claude_args` del workflow.

- `--model haiku` o `--model opus` para bajar o subir de modelo.
- `sonnet` es un alias que apunta al Sonnet más reciente, así que el modelo, y con él el coste y el
  criterio, cambia cuando Anthropic publica uno nuevo, sin que se vea ningún diff en el repo. Para
  fijarlo, pon el nombre completo del modelo en vez del alias (ver
  [configuración de modelo](https://code.claude.com/docs/en/model-config)).
- `--effort low` para gastar menos en razonamiento, o `high` si las revisiones se quedan cortas.

## Credencial

Hay dos caminos, y cada uno tiene su entrada en la acción y su nombre de secreto.

### 1. Suscripción: `claude setup-token`

- Se genera en local con `claude setup-token`. Imprime un token de larga duración y no lo guarda en
  ningún sitio. Requiere un plan Pro, Max, Team o Enterprise
  ([documentación](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token)).
- **Secreto:** `CLAUDE_CODE_OAUTH_TOKEN`. **Entrada de la acción:** `claude_code_oauth_token`. Es la
  que el workflow trae configurada.
- Se guarda con `gh secret set CLAUDE_CODE_OAUTH_TOKEN`, que pide el valor sin dejarlo en el
  historial de la shell.
- El token va ligado a la suscripción de quien lo generó: consume sus límites, y si esa persona
  cambia de plan o lo revoca, el revisor deja de funcionar. Borrar el secreto no invalida el token.

### 2. Clave de API de la consola

- Se crea en la [Claude Console](https://platform.claude.com), en *API keys*. Empieza por `sk-ant-`.
- **Secreto:** `ANTHROPIC_API_KEY`. **Entrada de la acción:** `anthropic_api_key`. Para usarla, cambia
  en el workflow la línea `claude_code_oauth_token: ...` por la que está comentada justo encima.
- Es la opción recomendada si el secreto se comparte entre varios repositorios de una organización,
  porque no depende de la suscripción de nadie.

### No son intercambiables

Un token de suscripción metido en `anthropic_api_key`, o una clave de API metida en
`claude_code_oauth_token`, **falla en la primera llamada a la API con un error de autenticación que
no dice que las credenciales estén cruzadas**. Si el revisor falla nada más empezar, lo primero es
comprobar que entrada, nombre del secreto y tipo de credencial casan. Un secreto con otro nombre del
que espera el workflow tampoco da error de GitHub: llega vacío. Usa solo una de las dos entradas.

## PRs desde un fork en un repositorio público

Con el evento `pull_request`, GitHub **no pasa los secretos del repositorio** a los workflows que
dispara un fork: solo un `GITHUB_TOKEN` de lectura. La credencial llega vacía y el job falla. Aunque
llegara, la acción solo se ejecuta si el autor del PR tiene permiso de escritura en el repo, y quien
contribuye desde un fork normalmente no lo tiene. Resultado: en PRs de forks no hay revisión, solo
un check en rojo.

No se arregla pasando a `pull_request_target`. Ese evento ejecuta con los secretos del repositorio
base, y si además se hace checkout del código del PR, un texto o un archivo preparado por un
desconocido llega a un agente con tu credencial y herramientas (prompt injection). La
[guía de seguridad de la acción](https://github.com/anthropics/claude-code-action/blob/main/docs/security.md)
lo desaconseja, igual que `allowed_non_write_users`, que se salta la comprobación de permisos.

Qué hacer con un PR de un fork: lo revisa una persona mantenedora o, si se quiere la revisión de
Claude, alguien con escritura sube esa rama al propio repositorio y abre el PR desde ahí. Si molesta
el check en rojo, se puede saltar el job en forks con
`if: github.event.pull_request.head.repo.full_name == github.repository`.
