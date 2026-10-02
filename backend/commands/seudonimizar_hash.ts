import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import hash from '@adonisjs/core/services/hash'
import { PASSWORD_DEMO } from '#database/factories/user_factory'

/**
 * Imprime el hash de `PASSWORD_DEMO` con el hasher de la aplicación, y nada más.
 *
 * Lo usa `make copia-produccion`: `database/seudonimizar.sql` no puede calcular un
 * scrypt de Adonis, así que el hash llega de fuera y el SQL solo lo asigna. Sale por
 * la salida estándar para que el script lo capture; no es un secreto (es el hash de
 * una contraseña que ya está en el repositorio).
 */
export default class SeudonimizarHash extends BaseCommand {
  static commandName = 'seudonimizar:hash'
  static description = 'Imprime el hash de la contraseña de desarrollo (PASSWORD_DEMO)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.log(await hash.make(PASSWORD_DEMO))
  }
}
