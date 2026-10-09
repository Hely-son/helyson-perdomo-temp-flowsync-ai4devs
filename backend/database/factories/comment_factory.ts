import factory from '@adonisjs/lucid/factories'
import db from '@adonisjs/lucid/services/db'
import Comment, { COMMENT_BODY_MAX_LENGTH } from '#models/comment'
import { TaskFactory } from '#database/factories/task_factory'
import { UserFactory } from '#database/factories/user_factory'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

type Faker = FactoryContextContract['faker']

/**
 * Textos inventados, escritos como los dejaría un equipo en el hilo de una tarea: una
 * aclaración o una novedad. Ninguno lleva espacios sobrantes ni se acerca a los 500
 * caracteres, y no hay dos iguales.
 */
export const TEXTOS = [
  'Falta el informe del trimestre',
  'Lo he revisado y está bien, solo cambiaría el título',
  'He escrito a proveedores, espero respuesta mañana',
  'Sigue bloqueada hasta que soporte nos dé acceso',
  'Me apunto a revisarla esta tarde',
  'Subido el borrador a la carpeta compartida',
  'Ojo, esto toca también la exportación a hoja de cálculo',
  '¿Alguien sabe quién lo pidió? No encuentro el ticket original',
  'Probado en móvil: funciona, pero tarda un poco en cargar',
  'Lo dejo para después de la demo del jueves',
  'Hablado con diseño: prefieren la segunda opción',
  'He añadido los pasos para reproducirlo',
  'Ya no pasa con la última versión, lo vigilo un par de días',
  'Necesito media hora con alguien de backend para cerrarlo',
  'Pendiente de que legal revise el texto',
  'Cambiado el orden de las columnas como se habló',
  'Esto depende de la migración del planificador',
  'Le he puesto fecha para que no se nos pase',
  'Hecho en local, falta desplegarlo',
  'Lo he partido en dos: esta parte y la de permisos',
  'La causa era una zona horaria mal configurada',
  'Comprobado con lector de pantalla, sin problemas',
  'Hay que avisar a soporte cuando salga',
  'Los datos de ejemplo ya están en el entorno de pruebas',
  'Lo retomo el lunes, hoy no llego',
  'Gracias, así queda mucho más claro',
  'He dejado una nota en el README con el procedimiento',
  'Revisado con el cliente piloto: le encaja',
  'Hay un caso raro con ficheros vacíos, lo apunto aparte',
  'De acuerdo',
] as const satisfies readonly string[]

/**
 * Los textos se reparten como una baraja, igual que los títulos de `TaskFactory`: cada
 * llamada saca el siguiente y solo se vuelve a barajar al agotarse. Al rebarajar, si el
 * primero de la baraja nueva es el último que salió, se aparta al fondo: dos llamadas
 * seguidas a la factory nunca dan el mismo texto.
 */
let baraja: string[] = []
let ultimo: string | undefined

function siguienteTexto(faker: Faker, distintoDe?: string) {
  if (baraja.length === 0) {
    baraja = faker.helpers.shuffle([...TEXTOS])
    if (baraja.at(-1) === ultimo) baraja.unshift(baraja.pop()!)
  }

  let texto = baraja.pop()!
  if (texto === distintoDe) {
    // Con 30 textos distintos, el siguiente nunca coincide con este.
    if (baraja.length === 0) baraja = faker.helpers.shuffle(TEXTOS.filter((t) => t !== texto))
    const otro = baraja.pop()!
    baraja.unshift(texto)
    texto = otro
  }

  ultimo = texto
  return texto
}

/**
 * Un comentario. Lo que el esquema deja pasar y la factory no:
 *
 * - **Texto presentable.** El CHECK `comments_body_check` ya impide el vacío, los
 *   espacios en los extremos y pasar de 500; la factory además escribe frases que
 *   dicen algo, no `lorem ipsum`.
 * - **No repite seguido** (requisito «Un mismo comentario no se repite seguido»). Eso
 *   no lo impone la base, sino `CommentService`. La factory lo cumple por su cuenta:
 *   antes de guardar mira el último comentario de esa cuenta en esa tarea y, si el
 *   texto coincide, saca otro. Un texto fijado a mano con `merge` también pasa por aquí.
 * - **Tarea y autor de verdad.** Las claves foráneas lo exigen. Se dan con `merge`
 *   (`taskId`, `authorId`) o se crean con `.with('task')` / `.with('author')`, que
 *   usan `TaskFactory` y `UserFactory`.
 * - **Fecha coherente.** Sin `createdAt` explícito nace «ahora» (`autoCreate`), que
 *   nunca es anterior a su tarea. Quien la fije a mano (el seeder) la pone entre la
 *   creación de la tarea y ahora.
 */
export const CommentFactory = factory
  .define(Comment, ({ faker }) => {
    return {
      body: siguienteTexto(faker),
    }
  })
  .relation('task', () => TaskFactory)
  .relation('author', () => UserFactory)
  .before('create', async (_factory, comment, { faker, $trx }) => {
    comment.body = comment.body.trim()
    if (comment.body.length === 0 || comment.body.length > COMMENT_BODY_MAX_LENGTH) {
      throw new Error(`CommentFactory: texto de ${comment.body.length} caracteres`)
    }

    // Con la tarea o el autor aún por crear (`.with(...)`), no hay comentario anterior.
    if (comment.taskId === undefined || comment.authorId === undefined) return

    const anterior = await Comment.query({ client: $trx ?? db.connection() })
      .where('taskId', comment.taskId)
      .where('authorId', comment.authorId)
      .orderBy('id', 'desc')
      .first()

    if (anterior?.body === comment.body) {
      comment.body = siguienteTexto(faker, anterior.body)
    }
  })
  .build()
