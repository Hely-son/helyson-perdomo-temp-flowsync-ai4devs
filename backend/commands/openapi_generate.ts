import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { OPENAPI_DOCUMENT_PATH, renderOpenAPIDocument } from '#openapi/document'

export default class OpenapiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Escribe el documento OpenAPI en docs/api/openapi.json'

  /**
   * Hace falta la app arrancada: el documento sale de las rutas que registra
   * `start/routes.ts` y de la configuración de `config/openapi.ts`.
   */
  static options: CommandOptions = { startApp: true }

  async run() {
    const document = await renderOpenAPIDocument()
    await mkdir(dirname(OPENAPI_DOCUMENT_PATH), { recursive: true })
    await writeFile(OPENAPI_DOCUMENT_PATH, document)
    this.logger.success(`Documento escrito en ${relative(process.cwd(), OPENAPI_DOCUMENT_PATH)}`)
  }
}
