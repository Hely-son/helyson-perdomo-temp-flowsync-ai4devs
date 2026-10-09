import db from '@adonisjs/lucid/services/db'
import { errors } from '@vinejs/vine'
import Comment from '#models/comment'
import Task from '#models/task'
import type User from '#models/user'

/**
 * Escribir en el hilo de una tarea.
 *
 * Aquí vive la regla «Un mismo comentario no se repite seguido» de
 * `openspec/specs/comments/spec.md`, y no en el validador, porque solo se puede
 * cumplir de verdad dentro de la misma transacción que inserta.
 */
export class CommentService {
  /**
   * Crea el comentario `body` (ya validado y recortado) en la tarea `taskId`, a
   * nombre de `author`.
   *
   * La regla del repetido compara con el **último comentario de esa cuenta en esa
   * tarea**, no con el último de la tarea: lo que dijo otra persona entre medias no
   * convierte en repetido nada, y lo que diga otra cuenta con las mismas palabras
   * tampoco. «Último» se decide por `id` y no por `created_at`, porque dos inserciones
   * en el mismo milisegundo comparten marca de tiempo y el `id` no se repite nunca.
   *
   * **La carrera del doble envío está cerrada.** Sin más, dos peticiones idénticas que
   * llegan a la vez leen las dos el mismo «último» (que aún no es ninguna de ellas) y
   * las dos insertan: exactamente el doble clic que la regla quiere parar. Por eso,
   * antes de mirar, la transacción bloquea la fila de la tarea (`FOR UPDATE`): la
   * segunda petición espera a que la primera confirme, y como en READ COMMITTED cada
   * sentencia ve lo confirmado hasta ese momento, su consulta del último comentario ya
   * encuentra el de la primera y responde 422. El mismo bloqueo impide que la tarea se
   * vaya a la papelera entre la comprobación del controlador y el INSERT: si eso ya
   * ha ocurrido, la consulta no la encuentra (`Task` esconde lo borrado) y es un 404.
   *
   * El coste es que los comentarios a una misma tarea se escriben de uno en uno, y que
   * un cambio de estado o de fecha de esa tarea espera esos milisegundos. Para el hilo
   * de una tarea de un equipo es irrelevante.
   *
   * Si repite, lanza el mismo error que VineJS (`E_VALIDATION_ERROR`), así que sale
   * como cualquier otro 422 de validación: `{ errors: [{ field, message, rule }] }`.
   */
  async create(taskId: number, author: User, body: string): Promise<Comment> {
    const comment = await db.transaction(async (trx) => {
      await Task.query({ client: trx }).where('id', taskId).forUpdate().firstOrFail()

      const last = await Comment.query({ client: trx })
        .where('taskId', taskId)
        .where('authorId', author.id)
        .orderBy('id', 'desc')
        .first()

      if (last?.body === body) {
        throw new errors.E_VALIDATION_ERROR([
          {
            field: 'body',
            rule: 'notRepeated',
            message:
              'Acabas de escribir este mismo comentario en esta tarea. Escribe algo distinto o déjalo como está.',
          },
        ])
      }

      return Comment.create({ taskId, authorId: author.id, body }, { client: trx })
    })

    await comment.load('author')

    return comment
  }
}
