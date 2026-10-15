import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { OPENAPI_DOCUMENT_PATH, renderOpenAPIDocument } from '#openapi/document'

export default class OpenapiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Escribe el documento OpenAPI de la API en docs/api/openapi.json'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const content = await renderOpenAPIDocument()

    await mkdir(dirname(OPENAPI_DOCUMENT_PATH), { recursive: true })
    await writeFile(OPENAPI_DOCUMENT_PATH, content)

    this.logger.success(
      `Documento OpenAPI escrito en ${relative(process.cwd(), OPENAPI_DOCUMENT_PATH)}`
    )
  }
}
