import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import {
  OPENAPI_DOCUMENT_PATH,
  describeDifferences,
  renderOpenAPIDocument,
} from '#openapi/document'

/**
 * Cuántas diferencias se enumeran antes de resumir el resto. Basta para ver
 * qué ha cambiado sin enterrar la salida cuando el documento diverge entero.
 */
const MAX_LISTED_DIFFERENCES = 50

export default class OpenapiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description = 'Falla si docs/api/openapi.json no coincide con el documento que se genera'

  static options: CommandOptions = { startApp: true }

  /**
   * Solo compara: regenera en un directorio temporal y nunca escribe sobre el
   * fichero versionado. Arreglarlo es cosa de `openapi:generate`.
   */
  async run() {
    const versionedPath = relative(process.cwd(), OPENAPI_DOCUMENT_PATH)
    const tempDir = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))

    try {
      const generatedPath = join(tempDir, 'openapi.json')
      await writeFile(generatedPath, await renderOpenAPIDocument())
      const generated = await readFile(generatedPath, 'utf8')

      let versioned: string
      try {
        versioned = await readFile(OPENAPI_DOCUMENT_PATH, 'utf8')
      } catch {
        return this.#fail([`No existe ${versionedPath}.`])
      }

      if (versioned === generated) {
        this.logger.success(`${versionedPath} coincide con el documento generado`)
        return
      }

      let differences: string[]
      try {
        differences = describeDifferences(JSON.parse(versioned), JSON.parse(generated))
      } catch {
        return this.#fail([`${versionedPath} no es JSON válido.`])
      }

      if (differences.length === 0) {
        return this.#fail([
          `${versionedPath} tiene el mismo contenido que el generado, pero con otro formato u orden de claves.`,
        ])
      }

      const listed = differences.slice(0, MAX_LISTED_DIFFERENCES)
      const rest = differences.length - listed.length
      const count = differences.length === 1 ? '1 diferencia' : `${differences.length} diferencias`
      this.#fail([
        `${versionedPath} no coincide con el documento generado (${count}):`,
        ...listed.map((line) => `  ${line}`),
        ...(rest > 0 ? [`  ... y ${rest} más`] : []),
      ])
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  }

  #fail(lines: string[]) {
    for (const line of lines) this.logger.error(line)
    this.logger.info(
      'Si el cambio es intencionado, regenera el documento con `npm run openapi:generate`'
    )
    this.exitCode = 1
  }
}
