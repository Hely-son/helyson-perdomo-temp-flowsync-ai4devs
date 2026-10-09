import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Comentarios de una tarea (spec `openspec/specs/comments/spec.md`).
 *
 * Rama (convención 5): REVERSIBLE respecto a los datos que existen. Es una tabla nueva y
 * no mueve ni transforma ninguna fila de `tasks` ni de `users`; contado contra la base de
 * desarrollo por el MCP antes de escribirla: 0 personas y 0 tareas, y aunque hubiera, la
 * migración no las toca. Lo que `down()` descarta es la tabla entera, con los comentarios
 * que se hayan escrito desde que existe: con la tabla vacía no pierde nada.
 *
 * Sin `updated_at`: un comentario no se edita, y una columna que nadie escribe solo
 * serviría para que alguien la lea creyendo que significa algo.
 */
export default class extends BaseSchema {
  protected tableName = 'comments'
  protected bodyCheck = 'comments_body_check'

  async down() {
    // Se lleva consigo las claves foráneas, el índice y el CHECK, que son de la tabla.
    this.schema.dropTable(this.tableName)
  }

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      // CASCADE: un comentario solo existe colgado de su tarea; sin ella no tiene hilo en
      // el que leerse. Ojo: borrar una tarea desde la API NO dispara esto, porque la manda
      // a la papelera (`deleted_at`) y la fila sigue ahí: sus comentarios se conservan y
      // vuelven con ella al restaurarla. Solo un DELETE real de la fila (SQL a mano, o el
      // CASCADE de `tasks.assignee_id` al borrar la cuenta responsable) se los lleva.
      table
        .integer('task_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('tasks')
        .onDelete('CASCADE')

      // CASCADE, igual que `tasks.assignee_id` y `auth_access_tokens.tokenable_id`: hoy
      // borrar una cuenta ya borra sus tareas (y con ellas todos sus comentarios, sean de
      // quien sean). RESTRICT aquí dejaría el borrado de cuentas a medias según dónde
      // hubiera comentado, y SET NULL obligaría a un autor nulo que el contrato no admite
      // (todo comentario sale con su `author`). No hay ruta que borre cuentas; si llega,
      // la decisión de qué pasa con lo que alguien dijo se revisa entonces, aquí.
      table
        .integer('author_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      // `text` y no `varchar(500)`: el máximo lo pone el CHECK de abajo, junto con el resto
      // de la regla, para que no haya dos sitios que digan cuánto cabe.
      table.text('body').notNullable()

      table.timestamp('created_at').notNullable()

      // La regla del repetido busca el último comentario de una cuenta en una tarea
      // (`task_id`, `author_id`, el mayor `id`): este índice la resuelve sin recorrer el
      // hilo, y su prefijo `task_id` sirve también para leer el hilo de una tarea.
      table.index(['task_id', 'author_id', 'id'])
    })

    // Convención 2: el validador se salta con un INSERT, un seeder o una factory. La base
    // impone lo mismo que `createCommentValidator` sin ser nunca más estricta que él:
    //   - ya recortado: `btrim` solo quita espacios, que `trim()` de JS también quita;
    //   - entre 1 y 500: `char_length` cuenta puntos de código y `maxLength` de VineJS
    //     cuenta unidades UTF-16 (`.length`), que nunca son menos. Lo que pasa el
    //     validador cabe siempre aquí.
    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT ${this.bodyCheck}
      CHECK (body = btrim(body) AND char_length(body) BETWEEN 1 AND 500)
    `)
  }
}
