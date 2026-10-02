import Task from '#models/task'
import TrashedTask from '#models/trashed_task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import TrashedTaskTransformer from '#transformers/trashed_task_transformer'
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { ErrorResponse, TaskResponse, TrashedTaskListResponse } from '#openapi/schemas'

@ApiBearerAuth()
export default class TaskTrashController {
  /**
   * Lo que hay en la papelera, para cualquier miembro del espacio: lo borrado es de
   * todos, igual que lo vivo. Lo más reciente primero, con el desempate estable por
   * identificador que usa también la lista.
   *
   * No admite filtros ni paginación, por la misma razón que la lista: entera.
   */
  @ApiOperation({
    summary: 'La papelera: las tareas borradas',
    description:
      'Devuelve, de la más recientemente borrada a la más antigua, las tareas que están en la papelera, cada una con quién la llevaba y cuándo se borró. Es la misma para cualquier cuenta con sesión. Una tarea restaurada deja de salir aquí. No hay forma de vaciarla.',
  })
  @ApiResponse({
    status: 200,
    description:
      'La papelera entera. Vacía es una respuesta legítima: `data` es una lista sin filas.',
    type: () => TrashedTaskListResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Falta el token o no es válido. No se devuelve ninguna tarea.',
    type: () => ErrorResponse,
  })
  async index({ serialize }: HttpContext) {
    const tasks = await TrashedTask.query()
      .preload('assignee')
      .orderBy('deletedAt', 'desc')
      .orderBy('id', 'desc')

    return serialize(TrashedTaskTransformer.transform(tasks))
  }

  /**
   * Devolver una tarea de la papelera a la lista. Cualquier persona con sesión puede
   * hacerlo con cualquier tarea borrada, sea o no la responsable.
   *
   * Solo se quita la marca de borrado: título, estado, responsable y vencimiento no se
   * tocan, que es lo que significa restaurarla «tal cual».
   *
   * Una tarea que no está en la papelera —viva, o que no existe— es un 404: no hay nada
   * que restaurar y no se disfraza de éxito.
   */
  @ApiOperation({
    summary: 'Restaurar una tarea de la papelera',
    description:
      'Devuelve la tarea a la lista con su título, estado, responsable y fecha de vencimiento intactos, y desaparece de la papelera. Cualquier cuenta con sesión puede restaurar cualquier tarea borrada. Responde con la forma de lista, sin vencimiento.',
  })
  @ApiResponse({
    status: 200,
    description: 'La tarea ya restaurada, con la forma de la lista.',
    type: () => TaskResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Falta el token o no es válido. Nada cambia.',
    type: () => ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description:
      'No hay ninguna tarea con ese identificador en la papelera: no existe, o está viva y no hay nada que restaurar.',
    type: () => ErrorResponse,
  })
  async restore({ params, serialize }: HttpContext) {
    const trashed = await TrashedTask.findOrFail(params.id)
    trashed.deletedAt = null
    await trashed.save()

    // Se vuelve a leer por `Task`, no por la papelera: es la comprobación de que la
    // tarea ya está viva para el resto del sistema, y la forma de lista es la suya.
    const task = await Task.query().where('id', trashed.id).preload('assignee').firstOrFail()

    return serialize(TaskTransformer.transform(task))
  }
}
