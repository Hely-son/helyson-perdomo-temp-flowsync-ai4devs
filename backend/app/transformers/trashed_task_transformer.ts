import type Task from '#models/task'
import type TrashedTask from '#models/trashed_task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

/**
 * Una tarea tal y como se ve en la papelera: lo que tenía la de la lista, más cuándo
 * se borró (E2-10 CA-8, «con quién la llevaba y cuándo se borró»).
 *
 * Es un transformer aparte y no `TaskTransformer` con un campo más: la tarea viva no
 * lleva `deletedAt`, porque no puede tenerlo.
 *
 * Tampoco lleva el vencimiento, por la misma razón que no lo lleva la lista: es una
 * lista, y solo la tarea suelta informa de él. Restaurar la devuelve con la fecha
 * intacta; no hace falta enseñarla antes.
 */
export default class TrashedTaskTransformer extends BaseTransformer<Task | TrashedTask> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'deletedAt', 'createdAt', 'updatedAt']),
      assignee: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
