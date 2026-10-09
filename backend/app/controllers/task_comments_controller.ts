import Task from '#models/task'
import Comment from '#models/comment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { CommentService } from '#services/comment_service'
import { createCommentValidator } from '#validators/comment'
import CommentTransformer from '#transformers/comment_transformer'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import {
  CommentListResponse,
  CommentResponse,
  CreateCommentBody,
  ErrorResponse,
  ValidationErrorResponse,
} from '#openapi/schemas'

/**
 * El hilo de comentarios de una tarea (`openspec/specs/comments/spec.md`): se lee entero
 * con `index` y se escribe de uno en uno con `store`.
 */
@inject()
@ApiBearerAuth()
export default class TaskCommentsController {
  constructor(protected comments: CommentService) {}

  /**
   * Leer el hilo de una tarea, del comentario más antiguo al más reciente.
   *
   * - **Orden por `id` ascendente**, no por `created_at`: dos comentarios pueden
   *   compartir marca de tiempo (dos inserciones en el mismo milisegundo) y el `id` no
   *   se repite nunca. Es el mismo criterio con el que `CommentService.create` decide
   *   cuál es «el último» para la regla del repetido, así que el hilo y la regla nunca
   *   discrepan sobre el orden.
   * - **Una tarea en la papelera es un 404**, como si no existiera: `Task` esconde lo
   *   borrado. Sus comentarios no se borran con ella; se conservan y el hilo vuelve
   *   entero al restaurarla.
   * - **Cualquier cuenta con sesión lee el hilo de cualquier tarea viva**, igual que
   *   puede comentarla.
   * - **Sin paginación**: el hilo sale entero, como la lista de tareas.
   */
  @ApiOperation({
    summary: 'Leer el hilo de una tarea',
    description:
      'Devuelve los comentarios de la tarea, del más antiguo al más reciente (por orden de escritura), cada uno con su autor: solo su identificador, su nombre y sus iniciales, nunca su email. Cualquier cuenta con sesión puede leer el hilo de cualquier tarea viva. Sin paginación.',
  })
  @ApiResponse({
    status: 200,
    description:
      'El hilo entero. Una tarea sin comentarios es una respuesta legítima: `data` es una lista vacía.',
    type: () => CommentListResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Falta el token o no es válido. No se devuelve ningún comentario.',
    type: () => ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description:
      'No existe ninguna tarea viva con ese identificador: no existe, o está en la papelera. Los comentarios de una tarea borrada se conservan y vuelven a leerse al restaurarla.',
    type: () => ErrorResponse,
  })
  async index({ params, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)

    const comments = await Comment.query()
      .where('taskId', task.id)
      .preload('author')
      .orderBy('id', 'asc')

    return serialize(CommentTransformer.transform(comments))
  }

  /**
   * Comentar una tarea. Tres cosas que el orden decide:
   *
   * - **Primero la tarea, después el cuerpo.** Una tarea que no existe (o que está en
   *   la papelera, que para `Task` es lo mismo) es un 404 aunque el texto sea inválido:
   *   lo primero que falla es la dirección, no lo que se manda a ella.
   * - **El autor sale del token**, nunca del cuerpo. El validador solo declara `body`,
   *   así que un `author` o un `authorId` enviados no llegan a ninguna parte.
   * - **Comentar no toca la tarea**: no se guarda, no cambia su `updated_at` ni su
   *   responsable.
   */
  @ApiOperation({
    summary: 'Comentar una tarea',
    description:
      'Crea un comentario en el hilo de la tarea, a nombre de la cuenta dueña del token. El texto es el único dato que se lee: un `author` o un `authorId` en el cuerpo se ignoran. Comentar no cambia nada de la tarea. Cualquier cuenta con sesión puede comentar cualquier tarea viva.',
  })
  @ApiBody({ type: () => CreateCommentBody })
  @ApiResponse({
    status: 201,
    description: 'El comentario ya creado, con el texto recortado y su autor.',
    type: () => CommentResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Falta el token o no es válido. No se crea ningún comentario.',
    type: () => ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description:
      'No existe ninguna tarea viva con ese identificador: no existe, o está en la papelera. Se comprueba antes que el cuerpo, así que gana a cualquier 422.',
    type: () => ErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description:
      'El texto falta, está vacío, es solo espacios o pasa de 500 caracteres (regla de VineJS), o repite, ya recortado, el último comentario de la misma cuenta en esa tarea (regla `notRepeated`). Siempre sobre el campo `body`, y no se crea ningún comentario.',
    type: () => ValidationErrorResponse,
  })
  async store({ params, request, response, auth, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { body } = await request.validateUsing(createCommentValidator)
    const author = auth.getUserOrFail()

    const comment = await this.comments.create(task.id, author, body)

    // Como en `TasksController.store`: el estado se marca aparte y se devuelve la
    // promesa de `serialize()`; pasársela a `response.created()` deja el cuerpo vacío.
    response.status(201)
    return serialize(CommentTransformer.transform(comment))
  }
}
