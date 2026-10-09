import db from '@adonisjs/lucid/services/db'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Comment from '#models/comment'
import User from '#models/user'
import MainSeeder, { EQUIPO } from '#database/seeders/main_seeder'
import { CommentFactory } from '#database/factories/comment_factory'
import { emailPara } from '#database/factories/user_factory'

/**
 * Cuántos comentarios lleva el hilo de cada tarea comentada, en orden: unas con uno
 * solo, otras con una pequeña conversación. El resto de las tareas se queda sin
 * comentarios, que también es un estado normal.
 */
const HILOS = [3, 1, 4, 2, 2, 1, 3, 2]

export default class extends BaseSeeder {
  /**
   * Solo en desarrollo, como `main_seeder`: los autores son sus cuentas, que llevan una
   * contraseña pública.
   */
  static environment = ['development']

  /**
   * Comentarios de ejemplo sobre las tareas del equipo de `main_seeder`.
   *
   * **Sobre una base vacía también funciona.** Lo primero es lanzar `main_seeder`, que
   * es idempotente: si las cinco personas y sus 40 tareas ya están, no crea nada y se
   * reutilizan; si no, las crea exactamente como lo haría él. Se hace así, y no creando
   * aquí unas pocas cuentas y tareas propias, porque `node ace db:seed` ejecuta los
   * seeders por orden alfabético y este va antes: unas tareas sembradas aquí contarían
   * para las 40 de `main_seeder` y le desplazarían los casos de vencimiento que coloca
   * en las primeras posiciones.
   *
   * **Idempotente.** Se comentan las primeras tareas del equipo por `id` (las de la
   * papelera también cuentan, para que borrar una no haga que la siguiente vez se
   * comente otra), y solo las que todavía no tienen ningún comentario. La segunda vez
   * todas tienen el suyo y no se crea nada. Va en una transacción: o se siembra entero o
   * no queda nada a medias.
   *
   * **Sin repetir seguido.** Solo se escribe en hilos vacíos, así que ningún comentario
   * anterior puede chocar; y dentro del hilo, los textos los pone `CommentFactory`, que
   * antes de guardar mira el último comentario de esa cuenta en esa tarea y no lo repite.
   *
   * **Fechas coherentes.** Cada comentario cae entre la creación de su tarea y ahora,
   * en orden dentro del hilo: ninguno es anterior a su tarea ni está en el futuro.
   */
  async run() {
    await new MainSeeder(this.client).run()

    await db.transaction(async (trx) => {
      const equipo = await User.query({ client: trx })
        .whereIn('email', EQUIPO.map(emailPara))
        .orderBy('id')

      // Por la tabla y no por `Task`, que escondería las de la papelera.
      const tareas: { id: number; created_at: Date }[] = await trx
        .from('tasks')
        .select('id', 'created_at')
        .whereIn(
          'assignee_id',
          equipo.map((persona) => persona.id)
        )
        .orderBy('id')
        .limit(HILOS.length)

      const ahora = DateTime.now()

      for (const [i, tarea] of tareas.entries()) {
        const yaComentada = await Comment.query({ client: trx }).where('taskId', tarea.id).first()
        if (yaComentada) continue

        const creada = DateTime.fromJSDate(tarea.created_at)
        const margen = Math.max(0, ahora.diff(creada).as('milliseconds'))
        const total = HILOS[i]

        for (let j = 0; j < total; j++) {
          await CommentFactory.client(trx)
            .merge({
              taskId: tarea.id,
              // Avanza de dos en dos sobre cinco: en un hilo de hasta cuatro, cada
              // comentario es de una persona distinta.
              authorId: equipo[(i + j * 2) % equipo.length].id,
              createdAt: creada.plus({
                milliseconds: Math.floor(((j + 1) / (total + 1)) * margen),
              }),
            })
            .create()
        }
      }
    })
  }
}
