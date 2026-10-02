import User from '#models/user'
import { beforeFetch, beforeFind, belongsTo } from '@adonisjs/lucid/orm'
import { TaskSchema } from '#database/schema'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * La papelera: las filas de `tasks` que `Task` esconde, vistas desde el otro lado.
 *
 * Es la misma tabla con el filtro invertido, y solo existe para dos cosas: listar lo
 * borrado y restaurarlo. Está separada de `Task` a propósito y no es un «`Task` con
 * borradas incluidas»: así el código que trabaja con tareas vivas no tiene forma de
 * pedir una borrada, ni siquiera a propósito.
 *
 * Una tarea viva no se encuentra aquí, de modo que restaurar una que no está en la
 * papelera es «no existe» y no una operación vacía.
 */
export default class TrashedTask extends TaskSchema {
  static table = 'tasks'

  @beforeFind()
  @beforeFetch()
  static onlyTrashed(query: ModelQueryBuilderContract<typeof TrashedTask>) {
    query.whereNotNull('tasks.deleted_at')
  }

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>
}
