import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { OPENAPI_DOCUMENT_PATH, renderOpenAPIDocument } from '#openapi/document'

type Difference = {
  path: string
  kind: 'added' | 'removed' | 'changed'
  before?: unknown
  after?: unknown
}

/** Cuántas diferencias se listan antes de resumir el resto con un número. */
const MAX_LISTED = 50

/**
 * Regenera el documento OpenAPI en un directorio temporal y lo compara con el
 * versionado. Solo compara: no escribe nunca en `docs/api/openapi.json`.
 */
export default class OpenapiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Comprueba que docs/api/openapi.json coincide con el documento que genera el código'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const versionedName = relative(process.cwd(), OPENAPI_DOCUMENT_PATH)
    const workdir = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))

    try {
      const generatedPath = join(workdir, 'openapi.json')
      await writeFile(generatedPath, await renderOpenAPIDocument())
      const generated = await readFile(generatedPath, 'utf8')

      const versioned = await this.#readVersioned()
      if (versioned === null) {
        this.exitCode = 1
        this.logger.error(`No existe ${versionedName}.`)
        this.logger.log('Genéralo con `npm run openapi:generate` y commitéalo.')
        return
      }

      // Un checkout con `core.autocrlf` cambia los saltos de línea del
      // fichero. Eso no es una diferencia de contrato.
      if (versioned.replace(/\r\n/g, '\n') === generated) {
        this.logger.success(`${versionedName} coincide con el documento que genera el código.`)
        return
      }

      this.exitCode = 1
      this.logger.error(`${versionedName} no coincide con el documento que genera el código.`)
      this.#explain(versioned, generated)
      this.logger.log(
        'Si el cambio es intencionado, ejecuta `npm run openapi:generate` y commitea el fichero.'
      )
    } finally {
      await rm(workdir, { recursive: true, force: true })
    }
  }

  async #readVersioned(): Promise<string | null> {
    try {
      return await readFile(OPENAPI_DOCUMENT_PATH, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  #explain(versionedText: string, generatedText: string) {
    let versioned: unknown
    try {
      versioned = JSON.parse(versionedText)
    } catch (error) {
      this.logger.log(`El fichero versionado no es JSON válido: ${(error as Error).message}`)
      return
    }

    const differences = diff(versioned, JSON.parse(generatedText), '')
    if (differences.length === 0) {
      this.logger.log(
        'El contenido es el mismo; cambia solo la serialización (formato u orden de las claves).'
      )
      return
    }

    this.logger.log(
      `${differences.length} diferencia(s). «versionado» es el fichero, «generado» lo que dice el código:`
    )
    for (const difference of differences.slice(0, MAX_LISTED)) {
      this.logger.log(describe(difference))
    }
    if (differences.length > MAX_LISTED) {
      this.logger.log(`… y ${differences.length - MAX_LISTED} más.`)
    }
  }
}

/**
 * Diferencias entre dos valores JSON, como rutas dentro del documento. Mira
 * solo claves propias (`Object.hasOwn`): con `in`, una clave que se llamase
 * `constructor` o `toString` existiría siempre por herencia y su ausencia no
 * se detectaría.
 */
function diff(before: unknown, after: unknown, path: string): Difference[] {
  if (isContainer(before) && isContainer(after) && Array.isArray(before) === Array.isArray(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    const differences: Difference[] = []

    for (const key of keys) {
      const childPath = childPathOf(path, key, Array.isArray(before))
      const inBefore = Object.hasOwn(before, key)
      const inAfter = Object.hasOwn(after, key)

      if (!inBefore) {
        differences.push({ path: childPath, kind: 'added', after: after[key] })
      } else if (!inAfter) {
        differences.push({ path: childPath, kind: 'removed', before: before[key] })
      } else {
        differences.push(...diff(before[key], after[key], childPath))
      }
    }

    return differences
  }

  if (JSON.stringify(before) === JSON.stringify(after)) return []

  return [{ path: path || '(raíz)', kind: 'changed', before, after }]
}

function isContainer(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * `paths["/api/v1/tasks"].get.parameters[0]`: los nombres que son
 * identificadores van con punto, y el resto —rutas con `/`, códigos como
 * `200`— entre corchetes, para que se puedan leer y buscar.
 */
function childPathOf(path: string, key: string, inArray: boolean): string {
  if (inArray) return `${path}[${key}]`
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return path ? `${path}.${key}` : key
  return `${path}[${JSON.stringify(key)}]`
}

function describe({ path, kind, before, after }: Difference): string {
  switch (kind) {
    case 'added':
      return `  + ${path}: solo en el generado → ${preview(after)}`
    case 'removed':
      return `  - ${path}: solo en el versionado → ${preview(before)}`
    case 'changed':
      return `  ~ ${path}: versionado ${preview(before)} · generado ${preview(after)}`
  }
}

function preview(value: unknown): string {
  const text = JSON.stringify(value)
  return text.length > 80 ? `${text.slice(0, 77)}...` : text
}
