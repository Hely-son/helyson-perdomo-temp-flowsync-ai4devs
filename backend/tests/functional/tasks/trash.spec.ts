import User from '#models/user'
import Task from '#models/task'
import TrashedTask from '#models/trashed_task'
import { TaskFactory } from '#database/factories/task_factory'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Borrar una tarea es mandarla a la papelera (E2-10, RF-12 enmendado por PA-2). Un test
 * por cada criterio de `docs/backlog/E2-gestion-tareas/us-borrar-tarea.md` que se puede
 * probar contra la API:
 *
 *   CA-1  borrar quita la tarea de la lista       CA-8   lo borrado está en la papelera
 *   CA-2  desaparece para todo el equipo          CA-8b  restaurar la devuelve tal cual
 *   CA-3  se puede borrar una tarea ajena         CA-8c  no sale por ningún otro camino
 *   CA-9  borrar no es «marcar como hecha»        CA-10  borrar exige haber entrado
 *   CA-11 borrar dos veces no es un error nuevo
 *
 * Sin test, a propósito: CA-4, CA-5, CA-6 y CA-7. Son la confirmación explícita, lo que
 * dice, echarse atrás y la distancia entre borrar y cambiar de estado: todo eso es un
 * gesto de la interfaz, y este change es solo backend. La API es lo que ocurre cuando ya
 * se ha confirmado; por eso `DELETE` no pide nada más. El guardarraíl queda sin construir
 * hasta que haya interfaz (la nota de la historia lo avisa).
 *
 * El más importante es CA-8c. «Ningún otro camino» no se prueba con una ruta: se recorre
 * cada ruta que devuelve o modifica una tarea y se comprueba que la borrada no sale por
 * ninguna.
 */
test.group('Tasks | papelera', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // La tarea suelta exige el día de quien mira; aquí no se prueba el vencimiento.
  const HOY = '2026-08-20'

  async function persona(client: any, email: string, fullName: string) {
    const user = await User.create({ fullName, email, password: 'secreto123' })
    const login = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: login.body().data.token as string }
  }

  const con = (token: string) => ({ Authorization: `Bearer ${token}` })

  function tareaDe(
    user: User,
    datos: Partial<Pick<Task, 'title' | 'status' | 'dueDate'>> = {}
  ): Promise<Task> {
    return Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: user.id,
      ...datos,
    })
  }

  const ids = (response: any) => response.body().data.map((tarea: any) => tarea.id) as number[]

  async function lista(client: any, token: string, status?: string) {
    const request = client.get('/api/v1/tasks').headers(con(token))
    if (status) request.qs({ status })
    const response = await request
    response.assertStatus(200)
    return ids(response)
  }

  async function papelera(client: any, token: string) {
    const response = await client.get('/api/v1/tasks/trash').headers(con(token))
    response.assertStatus(200)
    return response.body().data as any[]
  }

  async function idsEnPapelera(client: any, token: string) {
    const tareas = await papelera(client, token)
    return tareas.map((tarea) => tarea.id) as number[]
  }

  const borrar = (client: any, token: string, id: number) =>
    client.delete(`/api/v1/tasks/${id}`).headers(con(token))

  const restaurar = (client: any, token: string, id: number) =>
    client.post(`/api/v1/tasks/${id}/restore`).headers(con(token))

  /** Lo que la papelera guarda de una tarea, leído directamente del modelo. */
  async function enPapelera(id: number) {
    const tarea = await TrashedTask.findOrFail(id)
    return tarea
  }

  test('CA-1 | borrar una tarea la quita de la lista', async ({ client, assert }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user)
    const otra = await tareaDe(user, { title: 'Otra' })

    assert.include(await lista(client, token), tarea.id)

    const response = await borrar(client, token, tarea.id)

    response.assertStatus(200)
    assert.equal(response.body().data.id, tarea.id)
    assert.isString(response.body().data.deletedAt)

    const despues = await lista(client, token)
    assert.notInclude(despues, tarea.id)
    // Borrar una no toca las demás.
    assert.include(despues, otra.id)
    // Va a la papelera, no se quita la fila: sigue existiendo y se puede encontrar allí.
    assert.isNotNull(await TrashedTask.find(tarea.id))
  })

  test('CA-2 | desaparece para todo el equipo, no solo para quien borra', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tarea = await tareaDe(ada.user)

    assert.include(await lista(client, grace.token), tarea.id)

    await borrar(client, ada.token, tarea.id)

    assert.notInclude(await lista(client, grace.token), tarea.id)
    assert.notInclude(await lista(client, ada.token), tarea.id)
  })

  test('CA-3 | se puede borrar una tarea ajena, sin permiso especial', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const deAda = await tareaDe(ada.user)

    const response = await borrar(client, grace.token, deAda.id)

    response.assertStatus(200)
    assert.notInclude(await lista(client, ada.token), deAda.id)
    // Y sigue siendo de Ada: borrar no la reasigna.
    assert.equal(response.body().data.assignee.id, ada.user.id)
  })

  test('CA-8 | la papelera lleva la tarea, con quién la llevaba y cuándo se borró', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const primera = await tareaDe(ada.user, { title: 'La primera', status: 'in_progress' })
    const segunda = await tareaDe(grace.user, { title: 'La segunda' })
    const viva = await tareaDe(ada.user, { title: 'Esta no se borra' })

    await borrar(client, ada.token, primera.id)
    await borrar(client, ada.token, segunda.id)

    const enLaPapelera = await papelera(client, grace.token)

    // Solo lo borrado, y lo más reciente primero.
    assert.deepEqual(
      enLaPapelera.map((tarea) => tarea.id),
      [segunda.id, primera.id]
    )
    assert.notInclude(
      enLaPapelera.map((tarea) => tarea.id),
      viva.id
    )

    const delaPrimera = enLaPapelera[1]
    assert.equal(delaPrimera.title, 'La primera')
    assert.equal(delaPrimera.status, 'in_progress')
    assert.equal(delaPrimera.assignee.fullName, 'Ada Lovelace')
    assert.equal(delaPrimera.assignee.initials, 'AL')
    assert.isString(delaPrimera.deletedAt)
    assert.isFalse(Number.isNaN(Date.parse(delaPrimera.deletedAt)))

    // El juego de claves exacto: ni el vencimiento (es una lista) ni datos de la cuenta.
    assert.deepEqual(Object.keys(delaPrimera).sort(), [
      'assignee',
      'createdAt',
      'deletedAt',
      'id',
      'status',
      'title',
      'updatedAt',
    ])
    assert.deepEqual(Object.keys(delaPrimera.assignee).sort(), ['fullName', 'id', 'initials'])
    assert.notInclude(JSON.stringify(enLaPapelera), 'ada@example.com')
  })

  test('CA-8 | una papelera sin nada es una lista vacía, no un error', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    await tareaDe(user)

    const response = await client.get('/api/v1/tasks/trash').headers(con(token))

    // Y `trash` no se lee como el identificador de una tarea.
    response.assertStatus(200)
    assert.deepEqual(response.body().data, [])
  })

  test('CA-8b | restaurar la devuelve tal cual y la saca de la papelera', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tarea = await tareaDe(ada.user, {
      title: 'Preparar la demo',
      status: 'in_progress',
      dueDate: '2026-12-01',
    })

    // Cómo se ve antes de borrarla, por el mismo camino por el que se verá después: se
    // compara contra eso y no contra un formato concreto de fecha.
    const antes = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .headers(con(ada.token))
    antes.assertStatus(200)
    assert.isNotNull(antes.body().data.dueDate)

    await borrar(client, ada.token, tarea.id)

    // Cualquier miembro la restaura, no solo quien la llevaba ni quien la borró.
    const response = await restaurar(client, grace.token, tarea.id)

    response.assertStatus(200)
    const restaurada = response.body().data
    assert.equal(restaurada.id, tarea.id)
    assert.equal(restaurada.title, 'Preparar la demo')
    assert.equal(restaurada.status, 'in_progress')
    assert.equal(restaurada.assignee.id, ada.user.id)
    // Es una tarea viva: la forma de la lista, que no lleva marca de borrado.
    assert.notProperty(restaurada, 'deletedAt')

    // Vuelve a la lista y desaparece de la papelera.
    assert.include(await lista(client, ada.token), tarea.id)
    assert.include(await lista(client, ada.token, 'in_progress'), tarea.id)
    assert.notInclude(await idsEnPapelera(client, ada.token), tarea.id)

    // La fecha de vencimiento, que la lista no enseña, también vuelve intacta.
    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .headers(con(ada.token))
    suelta.assertStatus(200)
    assert.equal(suelta.body().data.dueDate, antes.body().data.dueDate)
    assert.equal(suelta.body().data.title, 'Preparar la demo')
    assert.equal(suelta.body().data.status, 'in_progress')
    assert.equal(suelta.body().data.assignee.id, ada.user.id)
  })

  test('CA-8b | restaurar una tarea que no está en la papelera es «no existe»', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const viva = await tareaDe(user)

    const deLaViva = await restaurar(client, token, viva.id)
    const inexistente = await restaurar(client, token, 999999)

    deLaViva.assertStatus(404)
    inexistente.assertStatus(404)
    // La viva sigue donde estaba, sin tocar.
    assert.include(await lista(client, token), viva.id)

    // Restaurar dos veces seguidas tampoco es un éxito la segunda.
    const borrada = await tareaDe(user, { title: 'Otra' })
    await borrar(client, token, borrada.id)
    const primera = await restaurar(client, token, borrada.id)
    const segunda = await restaurar(client, token, borrada.id)

    primera.assertStatus(200)
    segunda.assertStatus(404)
  })

  /**
   * CA-8c. Una tarea por estado, todas borradas; después se recorre cada camino por el
   * que una tarea llega al cliente o se modifica y se comprueba que ninguna sale.
   */
  async function conTresBorradas(client: any) {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const viva = await tareaDe(user, { title: 'La viva', status: 'pending' })
    const borradas = [
      await tareaDe(user, { status: 'pending', dueDate: '2026-12-01' }),
      await tareaDe(user, { status: 'in_progress', dueDate: '2026-12-02' }),
      await tareaDe(user, { status: 'done', dueDate: '2026-12-03' }),
    ]
    for (const tarea of borradas) {
      const response = await borrar(client, token, tarea.id)
      response.assertStatus(200)
    }

    return { user, token, viva, borradas }
  }

  test('CA-8c | no sale en la lista, ni sin filtro ni con ninguno', async ({ client, assert }) => {
    const { token, viva, borradas } = await conTresBorradas(client)
    const borradasIds = borradas.map((tarea) => tarea.id)

    const caminos = [
      await lista(client, token),
      await lista(client, token, 'pending'),
      await lista(client, token, 'in_progress'),
      await lista(client, token, 'done'),
    ]

    for (const salida of caminos) {
      for (const id of borradasIds) assert.notInclude(salida, id)
    }
    // La viva sí sale: el recorrido no está vacío por casualidad.
    assert.include(caminos[0], viva.id)
  })

  test('CA-8c | tampoco se abre por su identificador', async ({ client }) => {
    const { token, viva, borradas } = await conTresBorradas(client)

    for (const tarea of borradas) {
      const response = await client
        .get(`/api/v1/tasks/${tarea.id}`)
        .qs({ today: HOY })
        .headers(con(token))

      response.assertStatus(404)
    }

    // La viva sí se abre: el 404 de arriba es por estar borradas, no por la ruta.
    const laViva = await client
      .get(`/api/v1/tasks/${viva.id}`)
      .qs({ today: HOY })
      .headers(con(token))
    laViva.assertStatus(200)
  })

  test('CA-8c | no se le puede cambiar el estado', async ({ client, assert }) => {
    const { token, borradas } = await conTresBorradas(client)

    for (const tarea of borradas) {
      const response = await client
        .patch(`/api/v1/tasks/${tarea.id}/status`)
        .headers(con(token))
        .json({ status: 'in_progress' })

      response.assertStatus(404)

      // Y no ha cambiado nada: sigue en la papelera con el estado que tenía.
      const enLaPapeleraAhora = await enPapelera(tarea.id)
      assert.equal(enLaPapeleraAhora.status, tarea.status)
    }
  })

  test('CA-8c | no se le puede cambiar la fecha', async ({ client, assert }) => {
    const { token, borradas } = await conTresBorradas(client)

    for (const tarea of borradas) {
      const tareaAntes = await enPapelera(tarea.id)
      const antes = JSON.stringify(tareaAntes.dueDate)

      const response = await client
        .put(`/api/v1/tasks/${tarea.id}/due-date`)
        .headers(con(token))
        .json({ dueDate: '2030-01-01', today: HOY })

      response.assertStatus(404)

      // La fecha que tenía es la que sigue teniendo (y no la 2030 que se intentó poner).
      const tareaDespues = await enPapelera(tarea.id)
      const despues = JSON.stringify(tareaDespues.dueDate)
      assert.equal(despues, antes)
      assert.notInclude(despues, '2030')
    }
  })

  test('CA-8c | para el resto del código la tarea borrada no existe', async ({
    client,
    assert,
  }) => {
    // El mecanismo, no solo las rutas: cualquier consulta nueva que se escriba sobre
    // `Task` hereda la regla sin acordarse de ella.
    const { borradas, viva } = await conTresBorradas(client)
    const [primera] = borradas

    assert.isNull(await Task.find(primera.id))
    await assert.rejects(() => Task.findOrFail(primera.id))
    assert.isNull(await Task.query().where('id', primera.id).first())
    assert.lengthOf(await Task.query().where('id', primera.id), 0)
    const vivas = await Task.all()
    assert.deepEqual(
      vivas.map((tarea) => tarea.id),
      [viva.id]
    )

    // Y al revés: la papelera solo ve lo borrado.
    assert.isNotNull(await TrashedTask.find(primera.id))
    assert.isNull(await TrashedTask.find(viva.id))
  })

  test('CA-8c | una tarea borrada por la factory tampoco se ve', async ({ client, assert }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const borrada = await TaskFactory.merge({ assigneeId: user.id }).apply('borrada').create()

    assert.notInclude(await lista(client, token), borrada.id)
    assert.include(await idsEnPapelera(client, token), borrada.id)
  })

  test('CA-9 | borrar no es «marcar como hecha»: son dos caminos distintos', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const hecha = await tareaDe(user, { title: 'La que se termina' })
    const borrada = await tareaDe(user, { title: 'La que se borra', status: 'in_progress' })

    // Marcar como hecha: sale de la vista por defecto, sigue consultable y no está
    // en la papelera.
    const marcada = await client
      .patch(`/api/v1/tasks/${hecha.id}/status`)
      .headers(con(token))
      .json({ status: 'done' })
    marcada.assertStatus(200)

    assert.notInclude(await lista(client, token), hecha.id)
    assert.include(await lista(client, token, 'done'), hecha.id)
    assert.notInclude(await idsEnPapelera(client, token), hecha.id)

    // Borrar: sale de la vista por defecto Y de «Hecho», y está en la papelera, con el
    // estado que tenía: borrar no la marca como hecha.
    await borrar(client, token, borrada.id)

    assert.notInclude(await lista(client, token), borrada.id)
    assert.notInclude(await lista(client, token, 'done'), borrada.id)
    const contenido = await papelera(client, token)
    const enLaPapelera = contenido.find((tarea) => tarea.id === borrada.id)
    assert.equal(enLaPapelera.status, 'in_progress')
  })

  test('CA-10 | sin sesión no se borra nada, ni se ve ni se restaura', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const viva = await tareaDe(user)
    const borrada = await tareaDe(user, { title: 'Ya borrada' })
    await borrar(client, token, borrada.id)

    const sinToken = await client.delete(`/api/v1/tasks/${viva.id}`)
    const inventado = await client
      .delete(`/api/v1/tasks/${viva.id}`)
      .header('Authorization', 'Bearer oat_1.esto-no-es-un-token')
    const verPapelera = await client.get('/api/v1/tasks/trash')
    const alRestaurar = await client.post(`/api/v1/tasks/${borrada.id}/restore`)

    sinToken.assertStatus(401)
    inventado.assertStatus(401)
    verPapelera.assertStatus(401)
    alRestaurar.assertStatus(401)

    // La viva sigue viva y la borrada sigue en la papelera: no se ha movido nada.
    assert.include(await lista(client, token), viva.id)
    assert.isNotNull(await TrashedTask.find(borrada.id))
    assert.isNull(await Task.find(borrada.id))
  })

  test('CA-11 | borrar dos veces dice que ya no existe y no es un fallo del sistema', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tarea = await tareaDe(ada.user)

    const primera = await borrar(client, ada.token, tarea.id)
    primera.assertStatus(200)
    const alPrincipio = await enPapelera(tarea.id)
    const borradaEl = alPrincipio.deletedAt

    // La otra persona la tenía a la vista y la intenta borrar después.
    const segunda = await borrar(client, grace.token, tarea.id)

    // 404 y no 500: «ya no existe» no se presenta como un fallo del sistema.
    segunda.assertStatus(404)

    // No cuenta como un segundo borrado: la tarea sigue una sola vez en la papelera y
    // con la fecha del primero.
    const enLaPapelera = await papelera(client, ada.token)
    assert.lengthOf(
      enLaPapelera.filter((t) => t.id === tarea.id),
      1
    )
    const despues = await enPapelera(tarea.id)
    assert.equal(despues.deletedAt?.toMillis(), borradaEl?.toMillis())
  })

  test('CA-11 | borrar una tarea que no existe es el mismo «no existe»', async ({ client }) => {
    const { token } = await persona(client, 'ada@example.com', 'Ada Lovelace')

    const response = await borrar(client, token, 999999)

    response.assertStatus(404)
  })
})
