import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'
import Task, { TASK_STATUSES, type TaskStatus } from '#models/task'
import { toCalendarDay } from '#validators/task'
import { UserFactory } from '#database/factories/user_factory'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

type Faker = FactoryContextContract['faker']

/**
 * Las fechas de creación caen en los últimos 90 días contando desde el momento en
 * que se ejecuta, no desde una fecha fija: el dato envejece con el calendario.
 */
export const VENTANA_DIAS = 90

/**
 * Cuánto pesa cada estado al azar. El `Record` obliga a repartir peso entre los tres
 * estados del dominio: si se añadiera uno, esto dejaría de compilar. Lo hecho pesa
 * más porque en 90 días se termina más de lo que queda abierto.
 */
const PESO_POR_ESTADO: Record<TaskStatus, number> = {
  pending: 35,
  in_progress: 25,
  done: 40,
}

/**
 * Títulos inventados, escritos como los escribiría un equipo de producto: una frase
 * que dice de qué trabajo se habla (RF-6, y la limitación 4.4 del PRD: dos títulos
 * se solapan si no se reconocen). Ninguno lleva espacios sobrantes y todos quedan muy por
 * debajo de los 200 caracteres.
 */
const TITULOS = [
  'Refactor del flujo de alta de clientes en el panel de administración',
  'Corregir el desfase de un día en el calendario de la página de facturas',
  'Preparar la demo del jueves con los datos del cliente piloto',
  'Escribir la guía de migración para quien usa la API antigua',
  'Revisar las cuotas de uso del plan gratuito',
  'Investigar por qué el informe mensual tarda más de un minuto en generarse',
  'Añadir pruebas al módulo de cobros recurrentes',
  'Actualizar las dependencias del frontend a la última versión menor',
  'Rediseñar la pantalla de configuración de notificaciones',
  'Documentar el proceso de despliegue a producción',
  'Corregir el contraste del botón secundario en modo oscuro',
  'Cerrar el hueco de permisos en la exportación de datos',
  'Revisar los textos de error del formulario de pago',
  'Preparar la retrospectiva del trimestre',
  'Medir el tiempo de carga de la página de inicio',
  'Ordenar las etiquetas de la biblioteca de componentes',
  'Probar el flujo de recuperación de contraseña en móvil',
  'Migrar los trabajos nocturnos al nuevo planificador',
  'Quitar el código muerto del módulo de importación',
  'Entrevistar a tres usuarios del plan de equipo para el seguimiento',
  'Revisar la accesibilidad del selector de fechas con teclado',
  'Crear el entorno de pruebas para la integración de pagos',
  'Limpiar los registros del servidor que repiten el mismo aviso',
  'Decidir qué hacemos con el campo «empresa» del perfil',
  'Afinar los textos de la página de precios',
  'Reproducir el cierre inesperado al subir ficheros grandes',
  'Añadir una comprobación de salud al servicio de colas',
  'Redactar el resumen de la reunión con soporte',
  'Revisar los índices de la tabla de pedidos',
  'Traducir al portugués los mensajes del asistente de bienvenida',
  'Planificar la ventana de mantenimiento de la base de datos',
  'Unificar los formatos de fecha en las tablas del panel',
  'Preparar datos de ejemplo para el sitio de pruebas',
  'Corregir el orden de las columnas al exportar a hoja de cálculo',
  'Revisar el consumo de memoria del servicio de informes',
  'Investigar los reintentos duplicados del webhook de facturación',
  'Pulir la animación de la barra lateral',
  'Actualizar el diagrama de arquitectura del README',
  'Archivar los experimentos de la primera mitad del año',
  'Poner en marcha la copia de seguridad semanal de los ficheros subidos',
  'Comprobar que cerrar sesión la cierra en todas las pestañas',
  'Redactar la política de retención de registros',
  'Diseñar el estado vacío de la lista de proyectos',
  'Revisar el límite de peticiones por minuto de la API pública',
  'Arreglar el salto de línea que rompe el título en la vista de tarjeta',
  'Hacer un inventario de los permisos de la cuenta de servicio',
  'Probar la importación con un fichero de diez mil filas',
  'Simplificar el formulario de contacto',
  'Actualizar las capturas de la documentación de ayuda',
  'Dar nombre a las variables de entorno que hoy son números sueltos',
  'Evaluar un servicio de seguimiento de errores para el frontend',
  'Contestar los tickets de soporte con más de una semana sin respuesta',
  'Corregir el redondeo en el resumen de facturación',
  'Escribir el procedimiento para cuando la base de datos se llena',
  'Acordar la convención de nombres de las ramas',
  'Medir cuánto tarda el primer pintado en una conexión lenta',
  'Corregir el recibo: el importe sale sin el símbolo de moneda',
  'Ordenar la carpeta de diseños compartidos',
  'Probar la aplicación entera con un lector de pantalla',
  'Preparar el cambio de proveedor de alojamiento de imágenes',
  'Verificar las copias de seguridad restaurando una en el entorno de pruebas',
]

/**
 * Los títulos se reparten como una baraja: cada llamada saca el siguiente de una
 * mezcla y solo se vuelve a barajar al agotarse. Así, 40 tareas no repiten título,
 * y dos tareas con el mismo título (que el producto admite) serían un accidente
 * de la factory en lugar de un rasgo del dato de demostración.
 */
let baraja: string[] = []

function siguienteTitulo(faker: Faker) {
  if (baraja.length === 0) baraja = faker.helpers.shuffle(TITULOS)
  return baraja.pop()!
}

/** Un día del calendario, en el mismo formato en que lo guarda la API. */
function dia(fecha: DateTime) {
  return toCalendarDay(fecha)
}

function enLosUltimosDias(faker: Faker, dias: number) {
  const ahora = DateTime.now()
  const inicio = ahora.minus({ days: dias })
  const ms = faker.number.int({ min: 0, max: Math.floor(ahora.diff(inicio).as('milliseconds')) })
  return inicio.plus({ milliseconds: ms })
}

/**
 * Una tarea. Lo que el esquema deja pasar y la factory no:
 *
 * - **Estado, uno de tres.** La columna `status` es un `varchar` libre; los tres
 *   valores salen de `TASK_STATUSES` (RF-8, E2-3 CA-3). Nunca otro.
 * - **Título presentable.** `title` solo exige no nulo y ≤ 200: `''` y `'   '` pasan
 *   el esquema. Aquí siempre es una frase sin espacios sobrantes (RF-6, E2-2 CA-1 a
 *   CA-3).
 * - **Sin fecha por defecto.** `due_date` es nulable, pero nadie dice que deba ser
 *   raro. El producto sí: crear sin fecha es el camino normal y no tenerla no es un
 *   dato a medio rellenar (RF-13, FS-118 CA-1, CA-7, CA-12). Por eso ~80 % no la
 *   llevan. La fecha es texto `AAAA-MM-DD`, un día y no un instante (FS-118.2).
 * - **Las dos ramas de «vencida».** Se vence si la fecha es anterior a hoy y no está
 *   hecha (RF-14). Al azar caen de las dos clases; los estados `vencida`, `venceHoy`,
 *   `conFechaFutura` y `hechaConFechaPasada` fuerzan cada una (CA-5, CA-6, CA-9).
 *   Una fecha anterior a la creación es válida (FS-118 CA-13).
 * - **Responsable siempre registrado.** El FK lo exige; la relación `assignee` lo
 *   crea con `UserFactory` si no se da uno (RF-7, RF-10).
 * - **Fechas coherentes.** `created_at` dentro de los últimos 90 días, nunca en el
 *   futuro; `updated_at` nunca anterior a `created_at` (el esquema no lo comprueba),
 *   y una tarea que sigue en «Pendiente» no se ha tocado desde que nació.
 *
 * **Papelera.** Por defecto la tarea nace viva (`deleted_at` nulo). El estado `borrada`
 * la manda a la papelera; el seeder no lo usa, y los tests sí. Una tarea creada con él
 * no se ve por `Task`, solo por `TrashedTask` (RF-12 enmendado, E2-10).
 */
export const TaskFactory = factory
  .define(Task, ({ faker }) => {
    const createdAt = enLosUltimosDias(faker, VENTANA_DIAS)
    const hoy = DateTime.now()

    return {
      title: siguienteTitulo(faker),
      status: faker.helpers.weightedArrayElement(
        TASK_STATUSES.map((value) => ({ weight: PESO_POR_ESTADO[value], value }))
      ),
      dueDate: faker.datatype.boolean({ probability: 0.2 })
        ? dia(hoy.plus({ days: faker.number.int({ min: -20, max: 30 }) }))
        : null,
      createdAt,
      // La corrige el hook de abajo cuando ya se conoce el estado definitivo.
      updatedAt: createdAt,
    }
  })
  .relation('assignee', () => UserFactory)
  .state('pendiente', (task) => {
    task.status = 'pending'
  })
  .state('enCurso', (task) => {
    task.status = 'in_progress'
  })
  .state('hecha', (task) => {
    task.status = 'done'
  })
  .state('sinFecha', (task) => {
    task.dueDate = null
  })
  .state('borrada', (task) => {
    task.deletedAt = DateTime.now()
  })
  .state('vencida', (task, { faker }) => {
    if (task.status === 'done') {
      task.status = faker.helpers.arrayElement<TaskStatus>(['pending', 'in_progress'])
    }
    task.dueDate = dia(DateTime.now().minus({ days: faker.number.int({ min: 1, max: 30 }) }))
  })
  .state('venceHoy', (task, { faker }) => {
    if (task.status === 'done') {
      task.status = faker.helpers.arrayElement<TaskStatus>(['pending', 'in_progress'])
    }
    task.dueDate = dia(DateTime.now())
  })
  .state('conFechaFutura', (task, { faker }) => {
    task.dueDate = dia(DateTime.now().plus({ days: faker.number.int({ min: 1, max: 30 }) }))
  })
  .state('hechaConFechaPasada', (task, { faker }) => {
    task.status = 'done'
    task.dueDate = dia(DateTime.now().minus({ days: faker.number.int({ min: 1, max: 30 }) }))
  })
  .after('make', (_factory, task, { faker }) => {
    // Va aquí y no en `define` porque el estado puede cambiar por `merge` o por un
    // estado, y `updated_at` depende del estado definitivo.
    if (task.status === 'pending') {
      task.updatedAt = task.createdAt
      return
    }

    const margen = Math.max(0, Math.floor(DateTime.now().diff(task.createdAt).as('milliseconds')))
    task.updatedAt = task.createdAt.plus({
      milliseconds: faker.number.int({ min: 0, max: margen }),
    })
  })
  .build()
