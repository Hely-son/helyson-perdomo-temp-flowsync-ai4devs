import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import openapi from '@foadonis/openapi/services/main'

/**
 * El documento versionado. Vive en `docs/` en la raíz del repo, fuera de
 * `backend/`, junto al resto de la documentación.
 */
export const OPENAPI_DOCUMENT_PATH = app.makePath('..', 'docs', 'api', 'openapi.json')

/**
 * El mismo documento que sirve `/api.json`, construido sin servidor y
 * serializado de forma estable: indentado para que su diff se pueda leer en un
 * PR, y con salto de línea final.
 *
 * Fuera del servidor HTTP nadie ha hecho `commit()` del router, y sin él
 * `toJSON()` —que es de donde el paquete saca las rutas— llega vacío. Es lo
 * mismo que hace `list:routes` antes de leerlas.
 */
export async function renderOpenAPIDocument(): Promise<string> {
  router.commit()
  const document = await openapi.buildDocument()

  return `${JSON.stringify(document, null, 2)}\n`
}
