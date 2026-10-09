import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Texto del comentario. Un test por cada scenario del requisito «Ningún comentario vacío
 * ni excesivo» de `openspec/specs/comments/spec.md`.
 *
 * Todo entra por `POST /tasks/:id/comments`. Lo que se guarda (o que no se guarde nada)
 * se mira en la base, tabla `comments` con `task_id`, `author_id` y `body`, porque la
 * lectura del hilo todavía no existe.
 *
 * Cada rechazo lleva un control positivo sobre la misma tarea y con la misma cuenta: hoy
 * la ruta no existe y un 404 no puede hacer pasar un test que espera 422.
 *
 * Los textos son ASCII a propósito: así «caracteres» no depende de cómo se cuente un
 * carácter fuera de ese rango.
 */
test.group('Comments | texto del comentario', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // 500 caracteres exactos, sin repetir un único carácter: un recorte se notaría.
  const QUINIENTOS = 'abcdefghij'.repeat(50)

  const con = (token: string) => ({ Authorization: `Bearer ${token}` })

  async function sesion(client: any) {
    const email = 'ada@example.com'
    const user = await User.create({ fullName: 'Ada Lovelace', email, password: 'secreto123' })
    const login = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: login.body().data.token as string }
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

  const comentar = (client: any, token: string, id: number, cuerpo: Record<string, any>) =>
    client.post(`/api/v1/tasks/${id}/comments`).headers(con(token)).json(cuerpo)

  test('Texto ausente, vacío o de solo espacios | 422 sobre body y no se crea nada', async ({
    client,
    db,
  }) => {
    const { token } = await sesion(client)
    const tareaId = await crearTarea(client, token)

    const sinBody = await comentar(client, token, tareaId, {})
    const vacio = await comentar(client, token, tareaId, { body: '' })
    const espacios = await comentar(client, token, tareaId, { body: '   ' })

    for (const response of [sinBody, vacio, espacios]) {
      response.assertStatus(422)
      response.assertBodyContains({ errors: [{ field: 'body' }] })
    }
    await db.assertCount('comments', 0)

    // Control: la misma tarea admite un comentario con texto.
    const conTexto = await comentar(client, token, tareaId, { body: 'Ahora sí' })
    conTexto.assertStatus(201)
    await db.assertCount('comments', 1)
  })

  test('Texto demasiado largo | 501 caracteres es 422 sobre body y no se guarda nada', async ({
    client,
    db,
  }) => {
    const { token } = await sesion(client)
    const tareaId = await crearTarea(client, token)
    const quinientosUno = `${QUINIENTOS}k`

    const response = await comentar(client, token, tareaId, { body: quinientosUno })

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'body' }] })
    await db.assertCount('comments', 0)
    // Ni entero ni recortado: pasarse es un error, no un recorte silencioso.
    await db.assertMissing('comments', { body: QUINIENTOS })

    // Control: la misma tarea admite un comentario de longitud normal.
    const corto = await comentar(client, token, tareaId, { body: 'Uno corto' })
    corto.assertStatus(201)
    await db.assertCount('comments', 1)
  })

  test('Los espacios de los extremos no cuentan | "  Hecho  " queda "Hecho" y 500 más espacios se acepta', async ({
    client,
    assert,
    db,
  }) => {
    const { user, token } = await sesion(client)
    const tareaId = await crearTarea(client, token)

    const hecho = await comentar(client, token, tareaId, { body: '  Hecho  ' })

    hecho.assertStatus(201)
    assert.equal(hecho.body().data.body, 'Hecho')
    await db.assertHas('comments', { task_id: tareaId, author_id: user.id, body: 'Hecho' }, 1)
    await db.assertMissing('comments', { body: '  Hecho  ' })

    // 504 caracteres enviados, 500 de texto: los espacios no cuentan para el máximo.
    const limite = await comentar(client, token, tareaId, { body: `  ${QUINIENTOS}  ` })

    limite.assertStatus(201)
    assert.equal(limite.body().data.body, QUINIENTOS)
    assert.lengthOf(limite.body().data.body, 500)
    await db.assertHas('comments', { task_id: tareaId, body: QUINIENTOS }, 1)
    await db.assertCount('comments', 2)
  })
})
