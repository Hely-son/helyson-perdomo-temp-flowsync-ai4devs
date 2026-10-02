import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * RF-8: una tarea está siempre en uno de tres estados. Hasta ahora lo garantizaba solo
 * el código; `tasks.status` era un varchar(255) sin restricción y admitía cualquier cadena
 * (convención 2 de docs/convenciones/base-de-datos.md).
 *
 * Rama (convención 5): PIERDE DATOS, aprobado. Contado contra la base de desarrollo con
 * la copia seudonimizada de INC-0412: 230 tareas, 22 que hoy no cumplen la regla.
 *
 *   Hecho / DONE / "done "  (13)  ->  done
 *   En curso                ( 5)  ->  in_progress
 *   Pendiente               ( 4)  ->  pending
 *
 * El significado se conserva; lo que se pierde es la grafía original, y con ella qué
 * filas eran `Hecho`, cuáles `DONE` y cuáles `done ` (tres valores acaban en uno).
 * `down()` no puede devolverlo.
 *
 * Falla en alto con lo que no conoce: solo se reescriben esas cinco grafías. Si hay
 * cualquier otro valor fuera de los tres (en producción, por ejemplo), no se toca, el
 * `ADD CONSTRAINT` falla y la transacción de la migración deshace también el `UPDATE`:
 * no queda nada a medias.
 */
export default class extends BaseSchema {
  protected tableName = 'tasks'
  protected constraintName = 'tasks_status_check'

  async down() {
    // Solo quita la restricción. Los estados ya normalizados se quedan como están: la
    // grafía original (`Hecho`, `DONE`, `done `, `En curso`, `Pendiente`) no se guardó
    // en ningún sitio y no hay forma de reconstruirla.
    this.schema.raw(`ALTER TABLE ${this.tableName} DROP CONSTRAINT ${this.constraintName}`)
  }

  async up() {
    // Primero los datos, después la regla: con la regla puesta no cabrían.
    this.schema.raw(`
      UPDATE ${this.tableName}
      SET status = CASE lower(btrim(status))
        WHEN 'hecho'     THEN 'done'
        WHEN 'done'      THEN 'done'
        WHEN 'en curso'  THEN 'in_progress'
        WHEN 'pendiente' THEN 'pending'
      END
      WHERE status NOT IN ('pending', 'in_progress', 'done')
        AND lower(btrim(status)) IN ('hecho', 'done', 'en curso', 'pendiente')
    `)

    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT ${this.constraintName}
      CHECK (status IN ('pending', 'in_progress', 'done'))
    `)
  }
}
