import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Doble envío. Un test por cada scenario del requisito «Un mismo comentario no se repite
 * seguido» de `openspec/specs/comments/spec.md`.
 *
 * La regla es estrecha a propósito: solo se rechaza el texto idéntico (una vez recortado)
 * al último comentario de esa misma cuenta en esa misma tarea. Los dos scenarios que
 * siguen al primero comprueban que no rechaza de más.
 *
 * Todo entra por `POST /tasks/:id/comments`; lo que queda guardado se mira en la base,
 * tabla `comments` con `task_id`, `author_id` y `body`, porque la lectura del hilo
 * todavía no existe. Todos los tests esperan algún 201, así que ninguno pasa sin la ruta.
 */
test.group('Comments | sin repetir seguido', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const con = (token: string) => ({ Authorization: `Bearer ${token}` })

  async function persona(client: any, email: string, fullName: string) {
    const user = await User.create({ fullName, email, password: 'secreto123' })
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

  const comentar = (client: any, token: string, id: number, body: string) =>
    client.post(`/api/v1/tasks/${id}/comments`).headers(con(token)).json({ body })

  test('El mismo texto dos veces seguidas | 201, luego 422 sobre body y un solo comentario', async ({
    client,
    db,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tareaId = await crearTarea(client, ada.token)

    const primero = await comentar(client, ada.token, tareaId, 'Subido el informe')
    const segundo = await comentar(client, ada.token, tareaId, 'Subido el informe')

    primero.assertStatus(201)
    segundo.assertStatus(422)
    segundo.assertBodyContains({ errors: [{ field: 'body' }] })

    // El requisito compara el texto ya recortado: los espacios no lo hacen distinto.
    const conEspacios = await comentar(client, ada.token, tareaId, '  Subido el informe  ')
    conEspacios.assertStatus(422)
    conEspacios.assertBodyContains({ errors: [{ field: 'body' }] })

    await db.assertHas(
      'comments',
      { task_id: tareaId, author_id: ada.user.id, body: 'Subido el informe' },
      1
    )
    await db.assertCount('comments', 1)
  })

  test('Lo repetido pero no seguido sí se admite | A, B y otra vez A, los tres 201', async ({
    client,
    db,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tareaId = await crearTarea(client, ada.token)

    const a = await comentar(client, ada.token, tareaId, 'Sigue bloqueada')
    const b = await comentar(client, ada.token, tareaId, 'He escrito a proveedores')
    const otraVezA = await comentar(client, ada.token, tareaId, 'Sigue bloqueada')

    a.assertStatus(201)
    b.assertStatus(201)
    otraVezA.assertStatus(201)

    await db.assertHas(
      'comments',
      { task_id: tareaId, author_id: ada.user.id, body: 'Sigue bloqueada' },
      2
    )
    await db.assertHas(
      'comments',
      { task_id: tareaId, author_id: ada.user.id, body: 'He escrito a proveedores' },
      1
    )
    await db.assertCount('comments', 3)
  })

  test('Otra cuenta puede decir lo mismo | dos cuentas, el mismo texto, los dos 201', async ({
    client,
    assert,
    db,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tareaId = await crearTarea(client, ada.token)

    const deAda = await comentar(client, ada.token, tareaId, 'De acuerdo')
    const deGrace = await comentar(client, grace.token, tareaId, 'De acuerdo')

    deAda.assertStatus(201)
    deGrace.assertStatus(201)
    assert.equal(deAda.body().data.author.id, ada.user.id)
    assert.equal(deGrace.body().data.author.id, grace.user.id)

    await db.assertHas(
      'comments',
      { task_id: tareaId, author_id: ada.user.id, body: 'De acuerdo' },
      1
    )
    await db.assertHas(
      'comments',
      { task_id: tareaId, author_id: grace.user.id, body: 'De acuerdo' },
      1
    )
    await db.assertCount('comments', 2)
  })
})
