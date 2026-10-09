import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comment from '#models/comment'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

/**
 * Un comentario tal y como sale de la API: `{ id, body, author, createdAt }`.
 *
 * No lleva `taskId`: se pide siempre colgado de una tarea (`/tasks/:id/comments`), y
 * quien lo recibe ya sabe de cuál.
 *
 * Del autor viajan su identificador, su nombre y sus iniciales, y nada más: ni el email
 * ni las fechas de la cuenta. Es exactamente lo que ya da `TaskAssigneeTransformer`,
 * y por eso se reutiliza en vez de repetirlo; si algún día el responsable de una tarea
 * necesitara un dato más, el autor de un comentario NO lo hereda sin más (el requisito
 * de comentarios dice «únicamente» esas tres claves): habría que separarlos entonces.
 */
export default class CommentTransformer extends BaseTransformer<Comment> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'body', 'createdAt']),
      author: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.author)),
    }
  }
}
