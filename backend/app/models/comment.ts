import Task from '#models/task'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import { CommentSchema } from '#database/schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Lo más largo que puede ser un comentario, ya recortado. Lo leen el validador, la
 * factory y el documento OpenAPI; la base lo impone por su cuenta con el CHECK
 * `comments_body_check` de la migración `create_comments_table`, y si cambia aquí,
 * cambia allí en una migración nueva.
 */
export const COMMENT_BODY_MAX_LENGTH = 500

/**
 * Un comentario sobre una tarea, a nombre de quien lo escribió.
 *
 * No se edita ni se borra desde la API: por eso no tiene `updated_at`. Las columnas
 * vienen de la clase generada (`database/schema.ts`); aquí solo van las relaciones.
 */
export default class Comment extends CommentSchema {
  /**
   * Pasa por `Task`, así que hereda su regla de la papelera: un comentario de una tarea
   * borrada no encuentra su tarea por aquí.
   */
  @belongsTo(() => Task)
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
