import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      // La versión del documento, no la del paquete: acompaña al prefijo
      // `/api/v1` de `start/routes.ts`, que es la única versión de la API que
      // el código expone hoy.
      version: '1.0.0',
    },
    // Dónde escucha la API en desarrollo. Sin esta lista, una herramienta que
    // importe el documento (Postman, un cliente generado) no sabe a qué dirección
    // lanzar las peticiones y las deja sin servidor.
    servers: [{ url: 'http://localhost:3333', description: 'Desarrollo local' }],
    components: {
      securitySchemes: {
        // El nombre `bearer` no es libre: es el que usa el decorador
        // `@ApiBearerAuth()` con el que se anotan los controladores, y sin este
        // esquema declarado esas referencias quedarían colgando.
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description:
            'Access token opaco emitido por `POST /api/v1/auth/login`, en la cabecera `Authorization: Bearer <token>`.',
        },
      },
    },
  },
})
