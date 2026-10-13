<!-- Generado desde la lección de ejercicio del módulo: no se edita a mano. -->

# Ejercicio FlowSync: pide una pieza de interfaz y mira si sale del catálogo

Es la última lección del módulo y la única que se hace con el portátil delante. Trae el setup del entorno, la tarea y cómo se entrega, todo en un sitio. La tarea tiene dos partes técnicas y una última con las tres líneas que entregas.

> 📌 **Ve guardando cada prompt tal cual lo lanzas**, desde el primero. Se entregan, y reescribirlos al final de memoria no sirve: lo que se revisa es **cómo lo pediste**, no la versión limpia que recuerdas. Hay un archivo esperándolos en el propio repositorio.

---

## 🔁 Cómo funciona este módulo

Hay tres momentos, y saberlos cambia cómo aprovechas cada uno.

**1. Lo intentas tú.** Sobre el proyecto de abajo, con tu agente y con el reloj puesto. Entregas lo que te salga, **con lo que tenga**. La entrega a medias no es un problema: este paso no se puntúa por completarlo, y lo que se discute en vivo son las cosas con las que te chocaste.

**2. Lo ves resuelto en el directo.** El mentor pide esta misma pieza, sobre esta misma pantalla y este mismo proyecto, y monta después el catálogo vivo (las piezas abiertas en el navegador, cada una en sus estados y con sus comprobaciones), que es el paso que tú no haces. Si a ti no te salió, ahí ves que se puede y cómo. Por eso conviene **mirar sin teclear**: lo vas a repetir con calma después.

**3. Lo replicas.** Los prompts que use el mentor te llegan por escrito. Con ellos vuelves a tu entorno y rehaces el recorrido, que es donde se asienta.

> ⚠️ **En el paso 3 no esperes salidas idénticas, y no es un fallo tuyo.** La inteligencia artificial (IA) no es determinista: con el mismo prompt cambian el nombre del componente, dónde lo deja y hasta si reutiliza algo del catálogo o lo dibuja de cero. Aquí eso es más visible que en ningún otro ejercicio, porque lo que se mide **es** lo que decidió el agente: si a ti te salió lo contrario que a la clase, eso es el dato. Lo que se repite es **la forma del recorrido**, no el texto.

---

## 🛠️ Deja el entorno listo

### 1. Comprueba lo que necesita tu máquina

Cuatro cosas, cada una con el comando que dice si la tienes y el síntoma de tenerla mal. Compruébalas **antes** de clonar nada: las cuatro fallan más tarde y con mensajes que no mencionan la causa.

- **Docker, corriendo**: `docker ps`. Si dice `Cannot connect to the Docker daemon`, está instalado y **apagado**. Ojo, que ese mensaje es igual que el de no tenerlo. Se instala desde `https://docs.docker.com/get-started/get-docker/`.
- **Node.js 24 o superior**: `node -v`. La capa de base de datos de este proyecto declara **24 como mínimo**, así que con versiones anteriores la instalación avisa y el arranque puede morir con errores que no hablan de versiones. Se instala desde `https://nodejs.org`.
- **`make`**: `make --version`. Si no responde: en macOS viene con las herramientas de línea de comandos (`xcode-select --install`); en Linux, con el paquete `build-essential` o equivalente.
- **Una cuenta de GitHub**: la entrega es un pull request desde tu propio fork hacia el repositorio del curso.

> 🖥️ **Dónde funciona esto, porque no es en todas partes igual.** En **macOS** y en **Linux**, tal cual. En **Windows**, **dentro de WSL** (*Windows Subsystem for Linux*, el subsistema de Linux para Windows), y esto no es una preferencia: los atajos del proyecto están escritos con órdenes de shell de macOS y Linux (`cp`, `test`, `rm`), así que **en PowerShell no funcionan**.
>
> Y la parte que se olvida: **todo tiene que estar dentro de WSL**, no solo el último comando. El clon, Node y `make`. Lo que instales en Windows no existe dentro de esa terminal. Clona además dentro del sistema de ficheros de Linux (`~/…`) y no en `/mnt/c`, o la instalación de dependencias irá muy lenta.

> 🔎 **Para este ejercicio no hace falta instalar nada más.** Las herramientas de prueba de interfaz de este módulo se instalan más adelante, y todas piden **la misma versión de Node** que ya necesitas aquí: son paquetes que solo se publican como módulos modernos de JavaScript y no arrancan con versiones anteriores. Si `node -v` te da 24 o más, estás cubierto para las dos cosas.

### 2. Forkea y clona el proyecto

Se trabaja sobre **tu propio fork**, porque sobre el repositorio del curso no tienes permiso de escritura: la entrega es un pull request desde él hacia el del curso.

1. Entra en **https://github.com/LIDR-academy/flowsync-ai4devs** y pulsa **Fork**.
2. Clona **tu fork** y entra en la carpeta.
3. Añade el repositorio original como `upstream` y trae de ahí la rama de partida:

```bash
git remote add upstream https://github.com/LIDR-academy/flowsync-ai4devs.git
git fetch upstream
git checkout -b s12/start upstream/s12/start
```

> 🚨 **La rama de partida se trae de `upstream`, no de tu fork.** El formulario de Fork de GitHub trae marcada la casilla de copiar **solo la rama por defecto**, así que tu fork se lleva `main` y nada más. Un `git checkout s12/start` a secas moriría con un `did not match any file(s) known to git` que **no menciona al fork por ningún lado**. Y aunque desmarcaras la casilla, un fork es **una foto del momento**: no recibe las ramas que se publiquen después.

### 3. Instálalo y levántalo

No hay `package.json` en la raíz. Los comandos de `npm` se ejecutan dentro de `backend/` y de `frontend/`, y el `Makefile` de la raíz ya lo hace por ti.

```bash
make setup   # solo la primera vez: instala dependencias, crea los .env, levanta las bases y migra
make db-up   # levanta las dos bases de datos y espera a que estén sanas
make start   # levanta backend y frontend a la vez; Ctrl-C para los dos
make help    # lista todos los atajos
```

`make start` **se queda corriendo en esa terminal**: para lo demás, abre otra.

Comprueba que cada pieza vive:

- **Backend** en `http://localhost:3333`. Desde otra terminal: `curl -s http://localhost:3333`.
- **Frontend** en `http://localhost:5173`. **Ábrelo en el navegador y regístrate**, porque esta vez la pantalla importa: es sobre ella sobre la que vas a trabajar.
- **Las dos bases de datos** en el **54410** (desarrollo) y el **54411** (pruebas). No se usa el 5432 a propósito: quien tenga un PostgreSQL suyo levantado se lo encontraría ocupado, y el error que vería no menciona a Docker por ningún lado.

Y la batería de pruebas del backend, una vez, antes de tocar nada. Es la mejor comprobación de que el entorno está bien montado:

```bash
make test        # migra la base de pruebas y corre la suite entera del backend
make test-unit   # solo la suite unitaria
make test-e2e    # solo la funcional: peticiones reales contra la API
```

La **API** (*Application Programming Interface*, la interfaz de programación por la que el frontend habla con el servidor) es lo que prueban esos tres. Del frontend conviene que sepas sus cuatro comandos, porque son los únicos que tiene hoy y vas a usar dos de ellos:

```bash
cd frontend
npm run dev      # el servidor de desarrollo (es lo que levanta `make start`)
npm run build    # compila, y el typecheck vive aquí dentro: si algo no tipa, sale por aquí
npm run lint     # oxlint (no es eslint)
npm run format   # Prettier sobre todo el frontend
```

> ⚠️ **Y fíjate en lo que NO hay: ni una herramienta de prueba en el frontend.** Ni para componentes, ni para navegador, ni para comparar capturas. No es un olvido: es el punto de partida del módulo, y una de las cosas que conviene mirar con tus propios ojos antes de empezar.

### 4. Comprueba el catálogo antes de tocar nada

Es tu línea de partida, y mirarla ahora es lo que hace que el resultado del ejercicio signifique algo. Dos comandos y un vistazo:

```bash
ls frontend/src/components/ui          # qué piezas con nombre existen
grep -c "^  --" frontend/src/index.css # cuántos valores con nombre hay declarados
```

Apunta esos dos números, el de piezas con nombre y el de valores con nombre. Y abre un momento `frontend/src/components/ui/button.tsx` para ver **qué variantes y qué tamaños declara el botón**: es el vocabulario que ya existe, y no te lo va a contar nadie más.

> 🔎 **Y busca, antes de empezar, valores de color escritos a pelo en `frontend/src/`.** Hexadecimales (`#1D4ED8`) o clases de paleta cruda (`bg-blue-600`). Apunta cuántos encuentras. Ese número es la otra mitad de tu línea de partida, y sin él la parte B del ejercicio no se puede responder.

### 5. Crea tu rama

Trabaja en **tu propia rama**, no en `s12/start`. Créala **antes del primer prompt** con este nombre:

```bash
git checkout -b interfaz-<tus-iniciales>
```

Si el agente commitea en una rama suya, tráete esos commits a la tuya con `git merge <esa-rama>` antes de empujar.

---

## 📋 La tarea

**Pide una pieza de interfaz nueva sobre la pantalla de tareas, sin decirle al agente de dónde sacarla, y averigua después si la pieza salió del catálogo o se la inventó.**

Es el mismo encargo que se resuelve en el directo, con la misma unidad de trabajo y los mismos insumos. **Los prompts los escribes tú**, y son la mitad de lo que se entrega.

**La unidad de trabajo es una y está nombrada:** una **barra de progreso sobre la pantalla de tareas**, encima del listado, que enseñe qué parte de las tareas que se están viendo está en estado `done`. Es un cambio solo de frontend: los números salen de lo que la API ya devuelve. No elijas otra pieza. Es pequeña a propósito: lo que se estudia no es la barra, es **de dónde sale**.

> ✋ **Y el corte es fijo: el ejercicio termina con el guardarraíl montado**, un aviso que hace visible lo que se escribe por fuera del catálogo y que montas en la parte B. No instales ningún catálogo vivo, ni ninguna herramienta de prueba de interfaz. Eso se ve resuelto en el directo, y lo que se compara allí es **tu resultado con el de la clase**.

### 🅰️ Parte A: pide la pieza, y no le ayudes

1. Abre el agente en la raíz del proyecto.
2. Pídele la barra de progreso **en tus propias palabras**, sin nombrarle el catálogo, sin nombrarle ningún archivo y sin decirle qué valores usar. Algo del tamaño de una frase.
3. Cuando termine, **mira dónde ha aterrizado lo que ha escrito**: vuelve a listar `frontend/src/components/ui` y compáralo con lo que apuntaste antes, y mira también `frontend/src/components/`.

> 🔀 **Y no uses `git status` para esto.** El propio proyecto le manda al agente cerrar su trabajo con un commit, así que lo más probable es que **`git status` te salga limpio** aunque acabe de escribir tres archivos. Lo que dice la verdad aquí es la carpeta, y `git log --oneline` y `git branch` te enseñan en qué rama acabó todo.

Tres restricciones, y ninguna es decorativa:

- **No le des pistas.** El ejercicio entero consiste en observar qué hace cuando no se las das. Si en tu prompt aparece la palabra *catálogo*, o la ruta `src/components/ui/`, o el nombre de un valor con nombre, has contestado tú la pregunta que venías a hacer.
- **Una sola pasada.** No le corrijas, no le pidas que lo rehaga mejor. Si algo te parece mal, apúntalo: eso es el hallazgo.
- **No arregles a mano lo que salga.** Lo que salga es el dato.

Y después, mide tres cosas mirando el cambio que ha producido:

- ¿La pieza nueva ha entrado en `src/components/ui/`, que es donde vive el catálogo, o se ha quedado fuera?
- ¿Ha usado los valores con nombre de `src/index.css`, o ha escrito algún color a pelo? Compara con el número que apuntaste antes.
- ¿Ha reutilizado alguna pieza que ya existía, o ha dibujado los elementos de interfaz por su cuenta?

### 🅱️ Parte B: el guardarraíl, que no impide nada

Ahora móntalo, y **pídeselo al agente**, que es parte de lo que se practica aquí. Dos piezas que hacen cosas distintas:

- **Un hook** que avise cuando se escriba un color a pelo en `frontend/src/`. Vive en `.claude/hooks/`, se registra en `.claude/settings.json`, y tienes dos modelos ya escritos al lado: `.claude/hooks/sin-borrar-datos.sh`, que lee desde la entrada estándar lo que el agente va a ejecutar y decide si lo para, y el hook de Prettier de `.claude/settings.json`, que saca la ruta del archivo que el agente acaba de tocar. **Avisa, no bloquea**, y `frontend/src/index.css` queda fuera, porque es la capa donde el valor literal sí se escribe.
- **Una regla en el `CLAUDE.md` del repositorio** que diga de dónde sale una pieza de interfaz nueva. Eso un script no lo puede comprobar, y por eso va escrito donde el agente lo lee en vez de en un guardarraíl.

Y luego **pruébalo pidiendo a propósito lo que el proyecto no quiere**: que cambie el color de tu barra por un azul escrito a pelo. Mira qué contesta la máquina.

> 🔀 **No te asustes si el agente se lleva el trabajo a otra rama.** El propio proyecto le prohíbe commitear en una rama de partida, así que en cuanto tenga algo que guardar creará una rama nueva y commiteará ahí sin pedírtelo. Es el proyecto haciendo lo que se le mandó, no un descuido. `git branch` y `git log --oneline` te enseñan dónde está todo.

### Parte C: las tres líneas

En un `HALLAZGOS.md` en la raíz del repositorio:

1. **Dónde aterrizó la pieza y con qué valores**, con los números que contaste: dentro o fuera del catálogo, cuántos colores a pelo había antes y cuántos después.
2. **Qué crees que decidió eso.** Es la pregunta interesante del ejercicio, y la respuesta no está en ningún sitio: se deduce mirando qué información tenía delante el agente cuando escribió. Si tu resultado no es el que esperabas al leer las lecciones, **dilo tal cual**: es el dato del ejercicio.
3. **Qué avisó el guardarraíl y qué no pudo ver.** Un script solo caza lo que es mecánico; lo demás se queda fuera, y saber cuál es ese resto es la mitad del asunto.

**El entregable no es tener la barra perfecta: son las tres líneas.** Una parte A a medias con las tres líneas escritas vale más que lo contrario, porque lo que importa es dónde te chocaste.

### Cómo saber que la has hecho bien

- **En tu prompt no aparece la palabra catálogo, ni la ruta de las piezas, ni el nombre de un valor con nombre.** Si aparece, contestaste tú la pregunta que venías a hacer, y el resultado ya no dice nada.
- **Fue una sola pasada.** Ni correcciones, ni *«hazlo mejor»*. Lo que salió a la primera es la medida.
- **Tienes los recuentos de antes y de después**, el de piezas del catálogo y el de colores a pelo, no una impresión. La diferencia es la primera línea.
- **Miraste la carpeta, no `git status`.** El proyecto le manda al agente commitear, así que `git status` limpio no significa que no haya escrito nada.
- **Las tres líneas están escritas y son concretas.** Si tu resultado contradice lo que esperabas al leer las lecciones, escríbelo tal cual, sin suavizarlo.

> Entrégalo con lo que tenga.

---

## 📤 Cómo se entrega

1. Trabaja en la rama `interfaz-<tus-iniciales>` que creaste al dejar el entorno listo, y no en `s12/start`.
2. **Guarda tus prompts en `prompts.md`, en la raíz.** Ese nombre y esa ubicación no son negociables: es lo que lee la herramienta que revisa las entregas. El repositorio ya lo trae con su plantilla puesta. **Cada prompt va en su propio bloque de código**, con el modelo y la herramienta que usaste. Aquí importa más que nunca: el prompt con el que pediste la pieza **es** el experimento.
3. Empuja tu rama a tu fork (`git push -u origin interfaz-<tus-iniciales>`) y abre el **pull request desde tu fork hacia el repositorio del curso** (`github.com/LIDR-academy/flowsync-ai4devs`; comprueba que el repositorio base que te propone GitHub es ese y no tu fork), con `HALLAZGOS.md` y `prompts.md` dentro.

### El plazo

**El plazo es antes del directo.**

---

## 📚 Si vas justo de tiempo

Prioriza la lección sobre **por qué un agente sin catálogo inventa un botón cada vez**, que es la hipótesis que tu ejercicio pone a prueba, y la que trata **por qué un color con nombre aguanta un rediseño y uno escrito a pelo no**, que es lo que vas a contar. Las otras tres pueden esperar.

Y si el reloj aprieta de verdad, la prioridad es la **parte A**: el guardarraíl de la parte B se monta rápido, pero la medición solo se puede hacer una vez.

---

## ✅ Antes de conectarte, comprueba

- [ ] Estás en la rama de partida, sobre **tu fork**, y `git push` funciona.
- [ ] `docker ps` devuelve una tabla, `node -v` responde `v24` o más, y `make --version` responde.
- [ ] **La pantalla se ve**: el frontend levanta, te registraste y el listado de tareas carga.
- [ ] **Tienes apuntados los dos recuentos**, el de piezas del catálogo y el de colores a pelo, antes y después.
- [ ] **Traes `HALLAZGOS.md`** con sus tres líneas, y el hook y la regla dentro del cambio.
- [ ] **`prompts.md` está relleno**, con modelo y herramienta en cada bloque, **incluido el prompt de la parte A tal cual lo lanzaste**.
- [ ] **Tu rama se llama `interfaz-<tus-iniciales>` y el pull request está abierto contra el repositorio del curso.**

> Trae el archivo tal como quedó, sin maquillarlo: lo que le falta es la mitad de lo interesante.

---

## 🎯 Qué te llevas del Módulo 12

**El modelo mental**: que un agente al que se le pide una pantalla no elige mal, se queda sin vocabulario, y que un catálogo con nombres convierte su trabajo de generar en elegir, que es donde un modelo es fiable. Que un valor de color escrito a pelo es un dato y un valor con nombre es una decisión, y que lo que de verdad arregla partir esos nombres en capas no es el rediseño, es poder responder a *si toco esto, qué se rompe*. Que una historia de un componente es una especificación que se ejecuta, así que no puede envejecer en silencio, y que el inventario de lo que se ha mirado y el de lo que existe pasan a ser el mismo documento. Que cómo se ve algo es una afirmación comprobable que ninguna prueba funcional comprueba, y que ahí lo que se automatiza no es el veredicto sino detectar y presentar, porque una diferencia de píxeles es un cambio y no un error. Y que probar interfaces tiene dos alturas que no se sustituyen: si el fallo se puede provocar fijando las entradas de una sola pieza es asunto de la pieza, y si solo aparece cuando dos piezas se pasan algo entre ellas es asunto del recorrido.

**Lo que queda en el proyecto**: una pieza de interfaz nueva en la pantalla de tareas, y el registro de si entró en el catálogo o se quedó fuera. Un hook en `.claude/hooks/` que avisa cuando alguien escribe un color a pelo en el frontend, con su línea en `.claude/settings.json`, y un bloque en el `CLAUDE.md` del repositorio que dice de dónde sale una pieza nueva: las dos mitades del guardarraíl, la mecánica y la que ningún script puede comprobar. Un fichero de hallazgos con tus tres líneas y tus números. Y el registro de tus prompts, con la forma exacta en que pediste la pieza, que es lo que te permite explicar después por qué salió lo que salió.

> 👥 **Qué te llevas según de dónde vengas.**
> - **Si eres dev**: cuando el agente inventa una pieza no es falta de disciplina, es falta de vocabulario: dale un catálogo con nombres y un aviso que salte con cada color escrito a pelo. Y reparte las pruebas por altura, porque duplicar la misma respuesta en dos sale caro.
> - **Si vienes de producto o gestión**: esto explica por qué un rediseño que sobre el papel es «cambiar un color» acaba costando dos semanas, y por qué «pero si todo estaba probado» puede ser cierto con el producto caído. Un componente se puede revisar en su catálogo sin esperar a que alguien lo monte en una pantalla.
> - **Si no tienes background técnico**: la elección de fondo es reutilizar algo que ya existe o fabricarlo otra vez. Y una diferencia en cómo se ve algo es un cambio, no un error: decidir si está bien le toca a una persona.
