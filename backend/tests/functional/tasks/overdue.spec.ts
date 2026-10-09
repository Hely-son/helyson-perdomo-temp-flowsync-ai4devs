import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Cuándo una tarea está vencida. Un test por cada scenario del requisito «Cuándo una
 * tarea está vencida» de `openspec/specs/tasks/spec.md`.
 *
 * Todo entra por HTTP, como entra el cliente: la tarea se crea con `POST /tasks`, la
 * fecha se pone con `PUT /tasks/:id/due-date`, el estado se cambia con
 * `PATCH /tasks/:id/status`, y lo que se comprueba es el `isOverdue` que viaja en el
 * cuerpo de la respuesta, no lo que devuelva ningún método del modelo.
 *
 * El día de referencia es siempre un literal que se pasa en `today`. Ningún test mira
 * el reloj: el resultado no puede depender de cuándo se ejecute la suite.
 */
test.group('Tasks | vencimiento', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const HOY = '2026-08-13'
  const AYER = '2026-08-12'
  const MAÑANA = '2026-08-14'

  const con = (token: string) => ({ Authorization: `Bearer ${token}` })

  async function sesion(client: any) {
    const email = 'ada@example.com'
    await User.create({ fullName: 'Ada Lovelace', email, password: 'secreto123' })

    const login = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return login.body().data.token as string
  }

  /** Crea una tarea por la API y devuelve el identificador que ella misma asigna. */
  async function crearTarea(client: any, token: string) {
    const creada = await client
      .post('/api/v1/tasks')
      .headers(con(token))
      .json({ title: 'Revisar el informe' })

    creada.assertStatus(201)

    return creada.body().data.id as number
  }

  async function fijarFecha(client: any, token: string, id: number, dueDate: string | null) {
    const response = await client
      .put(`/api/v1/tasks/${id}/due-date`)
      .qs({ today: HOY })
      .headers(con(token))
      .json({ dueDate })

    response.assertStatus(200)

    return response.body().data
  }

  async function cambiarEstado(client: any, token: string, id: number, status: string) {
    const response = await client
      .patch(`/api/v1/tasks/${id}/status`)
      .headers(con(token))
      .json({ status })

    response.assertStatus(200)
  }

  async function consultar(client: any, token: string, id: number, today = HOY) {
    const response = await client.get(`/api/v1/tasks/${id}`).qs({ today }).headers(con(token))

    response.assertStatus(200)

    return response.body().data
  }

  test('una tarea no hecha con fecha del día anterior llega vencida', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const id = await crearTarea(client, token)
    await fijarFecha(client, token, id, AYER)

    const tarea = await consultar(client, token, id)

    assert.equal(tarea.status, 'pending')
    assert.equal(tarea.dueDate, AYER)
    assert.isTrue(tarea.isOverdue)
  })

  test('vencer hoy todavía no es estar vencida', async ({ client, assert }) => {
    const token = await sesion(client)
    const id = await crearTarea(client, token)
    await fijarFecha(client, token, id, HOY)

    const tarea = await consultar(client, token, id)

    assert.equal(tarea.status, 'pending')
    assert.equal(tarea.dueDate, HOY)
    assert.isFalse(tarea.isOverdue)
  })

  test('una tarea con fecha futura no llega vencida', async ({ client, assert }) => {
    const token = await sesion(client)
    const id = await crearTarea(client, token)
    await fijarFecha(client, token, id, MAÑANA)

    const tarea = await consultar(client, token, id)

    assert.equal(tarea.dueDate, MAÑANA)
    assert.isFalse(tarea.isOverdue)
  })

  test('una tarea sin fecha no se vence nunca, por antigua que sea', async ({ client, assert }) => {
    const token = await sesion(client)
    const id = await crearTarea(client, token)

    // «Creada hace semanas» se consigue mirándola desde un día muy posterior a
    // cualquier momento en que esta suite pueda ejecutarse, no esperando ni tocando
    // la fecha de creación.
    const tarea = await consultar(client, token, id, '2099-12-31')

    assert.equal(tarea.status, 'pending')
    assert.isNull(tarea.dueDate)
    assert.isFalse(tarea.isOverdue)
  })

  test('darla por hecha la deja de vencer y conserva su fecha', async ({ client, assert }) => {
    const token = await sesion(client)
    const id = await crearTarea(client, token)
    await fijarFecha(client, token, id, AYER)

    const antes = await consultar(client, token, id)
    assert.isTrue(antes.isOverdue, 'la tarea tiene que estar vencida antes de darla por hecha')

    await cambiarEstado(client, token, id, 'done')

    const despues = await consultar(client, token, id)

    assert.equal(despues.status, 'done')
    assert.isFalse(despues.isOverdue)
    assert.equal(despues.dueDate, antes.dueDate)
  })

  test('una tarea hecha con la fecha pasada no llega vencida', async ({ client, assert }) => {
    const token = await sesion(client)
    const id = await crearTarea(client, token)
    await cambiarEstado(client, token, id, 'done')
    await fijarFecha(client, token, id, AYER)

    const tarea = await consultar(client, token, id)

    assert.equal(tarea.status, 'done')
    assert.equal(tarea.dueDate, AYER)
    assert.isFalse(tarea.isOverdue)
  })

  test('aplazar una tarea vencida la deja de vencer en la misma respuesta', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const id = await crearTarea(client, token)
    await fijarFecha(client, token, id, AYER)

    const antes = await consultar(client, token, id)
    assert.isTrue(antes.isOverdue, 'la tarea tiene que estar vencida antes de aplazarla')

    const aplazada = await fijarFecha(client, token, id, MAÑANA)

    assert.equal(aplazada.id, id)
    assert.equal(aplazada.dueDate, MAÑANA)
    assert.isFalse(aplazada.isOverdue)
  })
})
