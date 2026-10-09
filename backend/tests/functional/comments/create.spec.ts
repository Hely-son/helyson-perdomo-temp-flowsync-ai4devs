import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Comentar una tarea. Un test por cada scenario del requisito «Comentar una tarea» de
 * `openspec/specs/comments/spec.md`.
 *
 * Son tests de contrato: todo entra por HTTP, como entra el cliente. La tarea se crea con
 * `POST /tasks` y el comentario con `POST /tasks/:id/comments`. Como la lectura del hilo
 * (`GET /tasks/:id/comments`) todavía no existe, «no se crea ningún comentario» se mira en
 * la base con las aserciones de Lucid, sobre la tabla `comments` y sus columnas
 * `task_id`, `author_id` y `body`: ese nombre también es parte del contrato.
 *
 * Hoy la ruta no existe y cualquier POST responde 404. Por eso los scenarios que esperan
 * un error llevan además un control positivo (la misma cuenta sí comenta una tarea que
 * existe y recibe 201): ninguno puede pasar sin la funcionalidad hecha.
 */
test.group('Comments | comentar una tarea', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // La tarea suelta exige el día de quien mira; aquí no se prueba el vencimiento.
  const HOY = '2026-10-09'

  const con = (token: string) => ({ Authorization: `Bearer ${token}` })

  async function persona(client: any, email: string, fullName: string) {
    const user = await User.create({ fullName, email, password: 'secreto123' })
    const login = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: login.body().data.token as string }
  }

  /** Crea una tarea por la API y devuelve el identificador que ella misma asigna. */
  async function crearTarea(client: any, token: string, title = 'Revisar el informe') {
    const creada = await client.post('/api/v1/tasks').headers(con(token)).json({ title })

    creada.assertStatus(201)

    return creada.body().data.id as number
  }

  const comentar = (client: any, token: string, id: number, cuerpo: Record<string, any>) =>
    client.post(`/api/v1/tasks/${id}/comments`).headers(con(token)).json(cuerpo)

  async function consultar(client: any, token: string, id: number) {
    const response = await client.get(`/api/v1/tasks/${id}`).qs({ today: HOY }).headers(con(token))

    response.assertStatus(200)

    return response.body().data
  }

  test('Alta con el texto como único dato | 201 con id, body, author y createdAt', async ({
    client,
    assert,
    db,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tareaId = await crearTarea(client, ada.token)

    const response = await comentar(client, ada.token, tareaId, {
      body: 'Falta el informe del trimestre',
    })

    response.assertStatus(201)

    const comentario = response.body().data
    assert.properties(comentario, ['id', 'body', 'author', 'createdAt'])
    assert.isNumber(comentario.id)
    assert.equal(comentario.body, 'Falta el informe del trimestre')
    assert.properties(comentario.author, ['id', 'fullName', 'initials'])
    assert.equal(comentario.author.id, ada.user.id)
    assert.equal(comentario.author.fullName, 'Ada Lovelace')
    assert.equal(comentario.author.initials, 'AL')
    assert.isString(comentario.createdAt)
    assert.isFalse(Number.isNaN(Date.parse(comentario.createdAt)))

    // Y queda guardado de verdad, colgado de esa tarea y a nombre de esa cuenta.
    await db.assertHas(
      'comments',
      { task_id: tareaId, author_id: ada.user.id, body: 'Falta el informe del trimestre' },
      1
    )
  })

  test('El comentario nace a nombre de quien lo envía | author y authorId del cuerpo se ignoran', async ({
    client,
    assert,
    db,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tareaId = await crearTarea(client, ada.token)

    // El token es de Ada; lo que dice el cuerpo apunta a Grace, por los dos caminos.
    const conAuthorId = await comentar(client, ada.token, tareaId, {
      body: 'Lo firmo yo',
      authorId: grace.user.id,
    })
    const conAuthor = await comentar(client, ada.token, tareaId, {
      body: 'Este también',
      author: { id: grace.user.id, fullName: 'Grace Hopper' },
    })

    for (const response of [conAuthorId, conAuthor]) {
      response.assertStatus(201)
      assert.equal(response.body().data.author.id, ada.user.id)
      assert.equal(response.body().data.author.fullName, 'Ada Lovelace')
    }

    await db.assertHas('comments', { task_id: tareaId, author_id: ada.user.id }, 2)
    await db.assertMissing('comments', { author_id: grace.user.id })
  })

  test('Comentar no cambia la tarea | título, estado y responsable siguen igual', async ({
    client,
    assert,
    db,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tareaId = await crearTarea(client, ada.token, 'Preparar la demo')

    // Fuera del estado inicial, para que «el mismo estado» no sea el valor por defecto.
    const cambio = await client
      .patch(`/api/v1/tasks/${tareaId}/status`)
      .headers(con(ada.token))
      .json({ status: 'in_progress' })
    cambio.assertStatus(200)

    const antes = await consultar(client, ada.token, tareaId)
    assert.equal(antes.status, 'in_progress')
    assert.equal(antes.assignee.id, ada.user.id)

    // Comenta otra cuenta: tampoco eso convierte a quien comenta en responsable.
    const response = await comentar(client, grace.token, tareaId, {
      body: 'Me apunto a revisarla',
    })
    response.assertStatus(201)
    await db.assertHas('comments', { task_id: tareaId, author_id: grace.user.id }, 1)

    const despues = await consultar(client, ada.token, tareaId)
    assert.equal(despues.title, antes.title)
    assert.equal(despues.status, antes.status)
    assert.deepEqual(despues.assignee, antes.assignee)
  })

  test('Una tarea que no existe no se comenta | 404 aunque el cuerpo sea inválido', async ({
    client,
    db,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tareaId = await crearTarea(client, ada.token)

    // Los identificadores de tarea son correlativos y, dentro de la transacción del test,
    // nadie más crea tareas: un millón por encima de la última recién creada no
    // corresponde a ninguna. No se borra una tarea para esto porque una borrada sigue
    // existiendo en la papelera, y el scenario habla de un identificador sin tarea.
    const inexistente = tareaId + 1_000_000
    const sueltaInexistente = await client
      .get(`/api/v1/tasks/${inexistente}`)
      .qs({ today: HOY })
      .headers(con(ada.token))
    sueltaInexistente.assertStatus(404)

    const valido = await comentar(client, ada.token, inexistente, { body: 'Hola' })
    const vacio = await comentar(client, ada.token, inexistente, { body: '' })
    const sinBody = await comentar(client, ada.token, inexistente, {})
    const largo = await comentar(client, ada.token, inexistente, { body: 'x'.repeat(501) })

    // 404 y no 422: lo primero es que la tarea no existe, diga lo que diga el cuerpo.
    for (const response of [valido, vacio, sinBody, largo]) response.assertStatus(404)
    await db.assertCount('comments', 0)

    // Control: la misma cuenta, con el mismo cuerpo, sí comenta la tarea que existe. El
    // 404 de arriba es por la tarea, no porque la ruta falte.
    const existente = await comentar(client, ada.token, tareaId, { body: 'Hola' })
    existente.assertStatus(201)
    await db.assertCount('comments', 1)
    await db.assertHas('comments', { task_id: tareaId, body: 'Hola' }, 1)
  })

  test('Sin sesión no se comenta | 401 sin token y con un token que no es válido', async ({
    client,
    db,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tareaId = await crearTarea(client, ada.token)

    const sinToken = await client
      .post(`/api/v1/tasks/${tareaId}/comments`)
      .json({ body: 'Sin haber entrado' })
    const tokenInventado = await client
      .post(`/api/v1/tasks/${tareaId}/comments`)
      .headers(con('oat_1.esto-no-es-un-token'))
      .json({ body: 'Sin haber entrado' })

    sinToken.assertStatus(401)
    tokenInventado.assertStatus(401)
    await db.assertCount('comments', 0)

    // Control: con un token válido, la misma petición sí crea el comentario.
    const conToken = await comentar(client, ada.token, tareaId, { body: 'Sin haber entrado' })
    conToken.assertStatus(201)
    await db.assertCount('comments', 1)
  })
})
