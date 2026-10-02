import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * RF-12 enmendado (PA-2): borrar una tarea la manda a la papelera y se puede restaurar.
 * `deleted_at` es esa papelera: nulo es una tarea viva, con fecha es una tarea en la
 * papelera desde ese momento. La fecha responde a «cuándo se borró» (E2-10 CA-8) y a la
 * vez es la marca; no hace falta una columna booleana aparte que pueda contradecirla.
 *
 * Rama (convención 5): REVERSIBLE respecto a los datos que existen. Contado contra la base
 * de desarrollo: 230 tareas y la migración no toca ninguna fila, solo añade una columna
 * nulable sin valor por defecto: todas nacen vivas.
 *
 * Lo que `down()` descarta es la columna entera, y con ella la marca de las tareas que
 * estén en la papelera en ese momento: dejan de estar borradas y vuelven a la lista, y se
 * pierde cuándo se borraron. Con la papelera vacía no pierde nada.
 *
 * Sin clave foránea ni valores cerrados (convenciones 2 y 3). Sin índice: la lista filtra
 * `deleted_at IS NULL` sobre una tabla de cientos de filas; se añade cuando una medida lo
 * pida, en otro cambio.
 */
export default class extends BaseSchema {
  protected tableName = 'tasks'

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('deleted_at')
    })
  }

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Nulable y sin valor por defecto: no estar en la papelera es el estado normal.
      table.timestamp('deleted_at').nullable()
    })
  }
}
