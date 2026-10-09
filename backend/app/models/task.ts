import User from '#models/user'
import { beforeFetch, beforeFind, belongsTo } from '@adonisjs/lucid/orm'
import { TaskSchema } from '#database/schema'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Los tres estados que puede tener una tarea. No se añaden, ni se renombran,
 * ni se eliminan: la lista sería otra cosa si esto fuera configurable.
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

/**
 * Lo que devuelve la lista cuando no se pide ningún filtro. No es «todas»: lo
 * hecho queda fuera, que es justo el motivo por el que existe el filtro.
 *
 * Se escribe explícita y no como `TASK_STATUSES` menos `'done'`: es una
 * decisión de producto sobre qué merece ocupar la pantalla, no el resultado de
 * una resta.
 */
export const DEFAULT_LIST_STATUSES = [
  'pending',
  'in_progress',
] as const satisfies readonly TaskStatus[]

/**
 * Una tarea viva: la que ve la lista, la que se abre, la que se modifica.
 *
 * **Lo que está en la papelera no existe para este modelo** (E2-10 CA-8c). No se
 * consigue acordándose de filtrar en cada consulta, sino al revés: toda lectura que
 * pase por `Task` —`Task.query()`, `find`, `findOrFail`, `first`, `all`— sale ya sin
 * lo borrado, y no hay un «incluir borradas» que alguien pueda activar sin querer. Un
 * endpoint nuevo que consulte `Task` sin pensar en la papelera sigue sin poder
 * encontrarla.
 *
 * Lo borrado se ve y se restaura desde `TrashedTask`, el mismo registro visto desde
 * el otro lado. Los hooks de Lucid no alcanzan a `update`/`delete` masivos ni a SQL
 * a mano: la red es esta, y los tests de `tests/functional/tasks/trash.spec.ts` la
 * recorren por cada ruta de la API.
 */
export default class Task extends TaskSchema {
  @beforeFind()
  @beforeFetch()
  static hideTrashed(query: ModelQueryBuilderContract<typeof Task>) {
    query.whereNull('tasks.deleted_at')
  }

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * La fecha de vencimiento como día del calendario `AAAA-MM-DD`, o `null` si no
   * tiene.
   *
   * `dueDate` no siempre trae lo que su tipo dice. Cuando la tarea se acaba de
   * modificar en memoria es el texto que se le asignó; cuando se lee de la base,
   * el driver de PostgreSQL convierte la columna `date` en un `Date` a medianoche
   * **local** de ese día. Aquí se reducen las dos formas a la misma: del `Date` se
   * toman año, mes y día con los getters locales, que son los que usó el driver
   * para construirlo. `toISOString()` pasaría por UTC y, con el proceso en un huso
   * al este de UTC, daría el día anterior.
   *
   * Todo lo que lea la fecha de una tarea —la regla de vencida y la respuesta de
   * la API— la lee por aquí, nunca de `dueDate` directamente.
   */
  get dueDay(): string | null {
    const value = this.dueDate as string | Date | null

    if (value === null || value === undefined) return null
    if (typeof value === 'string') return value

    const year = String(value.getFullYear()).padStart(4, '0')
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  /**
   * Si la tarea está vencida para quien mira desde `referenceDay`, un día del
   * calendario en formato `AAAA-MM-DD`.
   *
   * Tres condiciones y ninguna más, las del requisito «Cuándo una tarea está
   * vencida»: tiene fecha, esa fecha es **anterior** al día de referencia, y su
   * estado no es `done`. La última se escribe tal como la enuncia el requisito,
   * «no es `done`», y no como una lista de los estados que sí pueden vencer.
   *
   * La comparación es entre dos textos `AAAA-MM-DD`: el día de referencia tal
   * como llega y la fecha de la tarea reducida a texto por `dueDay`, venga del
   * driver como `Date` o asignada como texto. Comparados así, el orden de los
   * textos es el orden de los días, sin hora ni huso de por medio. El `<` es
   * estricto a propósito: vencer hoy todavía no es estar vencida, y un `<=`
   * incumpliría esa regla sin que nada fallara ruidosamente.
   *
   * El día llega por parámetro y no de ningún reloj. Es lo que hace que dos
   * personas en husos distintos obtengan lecturas distintas y las dos sean
   * correctas, y que una tarea pase a vencida sola al cambiar el día sin que
   * nadie la haya tocado: no hay nada congelado, se decide al mirar.
   *
   * Esta es la única definición de «vencida» del sistema. No se reimplementa en
   * ninguna otra capa, y en particular el frontend nunca compara fechas.
   */
  isOverdueOn(referenceDay: string): boolean {
    if (this.status === 'done') return false

    const dueDay = this.dueDay
    if (dueDay === null) return false

    return dueDay < referenceDay
  }
}
