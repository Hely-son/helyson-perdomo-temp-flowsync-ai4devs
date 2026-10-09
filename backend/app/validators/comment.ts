import vine from '@vinejs/vine'
import { COMMENT_BODY_MAX_LENGTH } from '#models/comment'

/**
 * El texto es lo único que un comentario necesita, y lo único que se lee del cuerpo.
 * La tarea sale de la URL y el autor del token: un `author` o un `authorId` enviados
 * no se declaran aquí, así que VineJS los deja fuera y nunca llegan al servicio.
 *
 * Mismo orden que `createTaskValidator`: `trim()` antes que `minLength()`, de modo que
 * un texto de solo espacios queda vacío y se rechaza igual que uno ausente. El máximo
 * se mide sobre el texto ya recortado, y pasarse es un error, nunca un recorte.
 *
 * Que no repita el último comentario de la misma cuenta no se comprueba aquí: necesita
 * mirar la base dentro de la misma transacción que inserta, y eso es del servicio
 * (`CommentService.create`).
 */
export const createCommentValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(COMMENT_BODY_MAX_LENGTH),
})
