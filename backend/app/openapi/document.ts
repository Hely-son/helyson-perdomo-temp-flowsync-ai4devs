import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import openapi from '@foadonis/openapi/services/main'

/**
 * El documento OpenAPI versionado, fuera de `backend/` porque es contrato de la
 * API y no código del servidor. Lo escribe `openapi:generate` y solo lo lee
 * `openapi:check`.
 */
export const OPENAPI_DOCUMENT_PATH = app.makePath('..', 'docs', 'api', 'openapi.json')

/**
 * Construye el documento igual que lo sirve `GET /api.json` —mismo servicio,
 * mismas rutas registradas— y lo serializa siempre de la misma forma: sangría
 * de dos espacios y salto de línea final. Que la serialización sea estable es
 * lo que permite a `openapi:check` comparar texto contra texto.
 *
 * Desde un comando de ace nadie arranca el servidor HTTP, que es quien hace el
 * `commit()` del router; sin él las rutas no llegan al store y el documento
 * sale sin `paths`. `commit()` es idempotente, así que llamarlo aquí no altera
 * nada cuando el router ya estaba confirmado.
 */
export async function renderOpenAPIDocument(): Promise<string> {
  router.commit()
  const document = await openapi.buildDocument()
  return `${JSON.stringify(document, null, 2)}\n`
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

/**
 * Lista las diferencias entre dos documentos como rutas JSON Pointer, para que
 * quien vea fallar la comprobación sepa qué operación o qué esquema ha cambiado
 * sin tener que hacer el diff a mano.
 */
export function describeDifferences(versioned: Json, generated: Json, path = ''): string[] {
  const at = path || '/'

  if (isObject(versioned) && isObject(generated)) {
    const keys = new Set([...Object.keys(versioned), ...Object.keys(generated)])
    return [...keys].flatMap((key) => {
      const child = `${path}/${escapePointer(key)}`
      if (!(key in generated)) return [`- ${child}: está en el versionado y ya no se genera`]
      if (!(key in versioned)) return [`+ ${child}: se genera y falta en el versionado`]
      return describeDifferences(versioned[key], generated[key], child)
    })
  }

  if (Array.isArray(versioned) && Array.isArray(generated)) {
    const length = Math.max(versioned.length, generated.length)
    return Array.from({ length }, (_, index) => {
      const child = `${path}/${index}`
      if (index >= generated.length) return [`- ${child}: está en el versionado y ya no se genera`]
      if (index >= versioned.length) return [`+ ${child}: se genera y falta en el versionado`]
      return describeDifferences(versioned[index], generated[index], child)
    }).flat()
  }

  if (JSON.stringify(versioned) === JSON.stringify(generated)) return []
  return [`~ ${at}: versionado ${preview(versioned)}, generado ${preview(generated)}`]
}

function isObject(value: Json): value is { [key: string]: Json } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function escapePointer(key: string) {
  return key.replaceAll('~', '~0').replaceAll('/', '~1')
}

function preview(value: Json) {
  const text = JSON.stringify(value)
  return text.length > 80 ? `${text.slice(0, 77)}...` : text
}
