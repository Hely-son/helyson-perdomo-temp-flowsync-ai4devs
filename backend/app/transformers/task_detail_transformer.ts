import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

/**
 * Una tarea con todo lo que tiene, incluidas su fecha de vencimiento y su
 * condición de vencida.
 *
 * Existe aparte de `TaskTransformer` a propósito, y no como una versión suya con
 * campos opcionales: la lista NO debe poder enseñar el vencimiento, y la forma
 * de garantizarlo es que el objeto que la lista devuelve no lo contenga. Así el
 * requisito deja de ser una convención que alguien tiene que recordar.
 *
 * El día de referencia llega al construirse porque la condición de vencida no es
 * un dato de la tarea: es el resultado de mirarla desde un día concreto, y ese
 * día lo pone quien mira.
 */
export default class TaskDetailTransformer extends BaseTransformer<Task> {
  constructor(
    resource: Task,
    private referenceDay: string
  ) {
    super(resource)
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'createdAt', 'updatedAt']),
      // `dueDay` y no `dueDate`: leída de la base, `dueDate` es un `Date` y viajaría
      // como un instante con hora y huso, no como el día `AAAA-MM-DD` del contrato.
      dueDate: this.resource.dueDay,
      isOverdue: this.resource.isOverdueOn(this.referenceDay),
      assignee: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
