import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Leer el hilo. Un test por cada scenario del requisito «Leer los comentarios de una
 * tarea» de `openspec/specs/comments/spec.md`.
 *
 * Son tests de contrato y todo entra y sale por HTTP: la tarea se crea con `POST /tasks`,
 * los comentarios con `POST /tasks/:id/comments` y el hilo se lee con
 * `GET /tasks/:id/comments`, que responde `{ data: [ { id, body, author, createdAt } ] }`
 * del más antiguo al más reciente. Aquí no se mira la base: lo que importa es lo que ve
 * el cliente.
 *
 * Hoy la ruta de lectura no existe y cualquier GET a ella responde 404. Todos los tests
 * esperan algún 200 o algún 201, y el del 404/401 lleva un control positivo (la misma
 * cuenta sí lee el hilo de una tarea que existe): ninguno puede pasar sin la funcionalidad.
 */
test.group('Comments | leer el hilo', (group) => {
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

  /** Comenta por la API y exige el 201: el hilo solo se lee sobre comentarios que existen. */
  async function comentar(client: any, token: string, id: number, body: string) {
    const response = await client
      .post(`/api/v1/tasks/${id}/comments`)
      .headers(con(token))
      .json({ body })

    response.assertStatus(201)

    return response.body().data
  }

  const hilo = (client: any, token: string, id: number) =>
    client.get(`/api/v1/tasks/${id}/comments`).headers(con(token))

  test('Orden de escritura | 200 con los tres comentarios en el orden en que se enviaron', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tareaId = await crearTarea(client, ada.token)

    const enviados = ['Primero: abro el hilo', 'Segundo: subo el borrador', 'Tercero: cerrado']
    for (const texto of enviados) await comentar(client, ada.token, tareaId, texto)

    const response = await hilo(client, ada.token, tareaId)

    response.assertStatus(200)

    const data = response.body().data
    assert.isArray(data)
    // Exactamente estos tres y en este orden: ni uno más, ni cambiados de sitio.
    assert.deepEqual(
      data.map((comentario: any) => comentario.body),
      enviados
    )
  })

  test('El autor no filtra datos de cuenta | author con solo id, fullName e initials, sin email', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tareaId = await crearTarea(client, ada.token)

    await comentar(client, ada.token, tareaId, 'Lo dejo listo hoy')
    await comentar(client, grace.token, tareaId, 'Yo lo reviso')

    const response = await hilo(client, ada.token, tareaId)

    response.assertStatus(200)

    const data = response.body().data
    assert.lengthOf(data, 2)

    // Cada comentario, con el autor que lo escribió y nada más de su cuenta.
    const esperados = [
      {
        body: 'Lo dejo listo hoy',
        author: { id: ada.user.id, fullName: 'Ada Lovelace', initials: 'AL' },
      },
      {
        body: 'Yo lo reviso',
        author: { id: grace.user.id, fullName: 'Grace Hopper', initials: 'GH' },
      },
    ]
    esperados.forEach((esperado, i) => {
      assert.equal(data[i].body, esperado.body)
      assert.sameMembers(Object.keys(data[i].author), ['id', 'fullName', 'initials'])
      assert.deepEqual(data[i].author, esperado.author)
    })

    // Ni dentro de author ni en ningún otro sitio de la respuesta.
    const texto = JSON.stringify(response.body())
    assert.notInclude(texto, 'ada@example.com')
    assert.notInclude(texto, 'grace@example.com')
  })

  test('Una tarea sin comentarios es una lista vacía | 200 con data igual a []', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tareaId = await crearTarea(client, ada.token)

    const response = await hilo(client, ada.token, tareaId)

    response.assertStatus(200)
    assert.deepEqual(response.body().data, [])
  })

  test('Los comentarios son de su tarea | cada hilo trae solo los comentarios de su tarea', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const informe = await crearTarea(client, ada.token, 'Revisar el informe')
    const demo = await crearTarea(client, ada.token, 'Preparar la demo')

    // Intercalados, para que el orden global no coincida con el de ninguna de las dos.
    await comentar(client, ada.token, informe, 'Informe: falta el anexo')
    await comentar(client, ada.token, demo, 'Demo: reservada la sala')
    await comentar(client, ada.token, informe, 'Informe: anexo subido')

    const delInforme = await hilo(client, ada.token, informe)
    delInforme.assertStatus(200)
    assert.deepEqual(
      delInforme.body().data.map((comentario: any) => comentario.body),
      ['Informe: falta el anexo', 'Informe: anexo subido']
    )

    // Y el de la otra trae los suyos: no basta con que un hilo salga vacío.
    const deLaDemo = await hilo(client, ada.token, demo)
    deLaDemo.assertStatus(200)
    assert.deepEqual(
      deLaDemo.body().data.map((comentario: any) => comentario.body),
      ['Demo: reservada la sala']
    )
  })

  test('Una tarea que no existe no tiene hilo | 404 sin tarea y 401 sin token', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tareaId = await crearTarea(client, ada.token)
    await comentar(client, ada.token, tareaId, 'Hay hilo')

    // Los identificadores de tarea son correlativos y, dentro de la transacción del test,
    // nadie más crea tareas: un millón por encima de la recién creada no corresponde a
    // ninguna. No se borra una tarea para esto porque una borrada sigue existiendo en la
    // papelera, y el scenario habla de un identificador sin tarea.
    const inexistente = tareaId + 1_000_000
    const sueltaInexistente = await client
      .get(`/api/v1/tasks/${inexistente}`)
      .qs({ today: HOY })
      .headers(con(ada.token))
    sueltaInexistente.assertStatus(404)

    const sinTarea = await hilo(client, ada.token, inexistente)
    sinTarea.assertStatus(404)

    // Sin token, o con uno inventado, sobre una tarea que sí existe y tiene hilo.
    const sinToken = await client.get(`/api/v1/tasks/${tareaId}/comments`)
    const tokenInventado = await hilo(client, 'oat_1.esto-no-es-un-token', tareaId)
    sinToken.assertStatus(401)
    tokenInventado.assertStatus(401)

    // Control: el mismo token sobre la tarea que existe sí lee el hilo. El 404 de arriba
    // es por la tarea, no porque la ruta falte.
    const existente = await hilo(client, ada.token, tareaId)
    existente.assertStatus(200)
    assert.deepEqual(
      existente.body().data.map((comentario: any) => comentario.body),
      ['Hay hilo']
    )
  })
})
