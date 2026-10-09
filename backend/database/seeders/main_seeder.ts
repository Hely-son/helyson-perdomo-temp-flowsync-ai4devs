import db from '@adonisjs/lucid/services/db'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Task from '#models/task'
import User from '#models/user'
import { TaskFactory, VENTANA_DIAS } from '#database/factories/task_factory'
import { UserFactory, emailPara } from '#database/factories/user_factory'

/**
 * Cinco personas con nombre fijo, para que quien desarrolla sepa con quién entrar:
 * el correo sale de `emailPara(nombre)` y la contraseña es `PASSWORD_DEMO`.
 */
export const EQUIPO = [
  'Lucía Fernández',
  'Mateo Ortega',
  'Valentina Navarro',
  'Iker Molina',
  'Carmen Ibáñez',
]

const TOTAL_TAREAS = 40

/**
 * Las tareas que ejercitan cada rama de la regla de vencimiento (RF-14), para que el
 * dato de desarrollo no dependa de que el azar las produzca. El resto, hasta 40, son
 * lo que dé la factory sola.
 */
const CASOS = [
  'vencida',
  'vencida',
  'vencida',
  'venceHoy',
  'conFechaFutura',
  'conFechaFutura',
  'conFechaFutura',
  'conFechaFutura',
  'hechaConFechaPasada',
  'hechaConFechaPasada',
] as const

export default class extends BaseSeeder {
  /**
   * Solo en desarrollo: estas cuentas llevan una contraseña pública.
   */
  static environment = ['development']

  /**
   * Se puede lanzar las veces que haga falta. Las personas se identifican por su
   * correo y no se vuelven a crear; de las tareas solo se crean las que faltan hasta
   * llegar a 40 entre las de estas cinco personas. Todo va en una transacción: o se
   * siembra entero o no queda nada a medias que el siguiente intento duplicaría.
   */
  async run() {
    await db.transaction(async (trx) => {
      const equipo: User[] = []
      for (const fullName of EQUIPO) {
        const email = emailPara(fullName)
        const existente = await User.query({ client: trx }).where('email', email).first()
        equipo.push(
          existente ?? (await UserFactory.client(trx).merge({ fullName, email }).create())
        )
      }

      const cuenta = await Task.query({ client: trx })
        .whereIn(
          'assigneeId',
          equipo.map((persona) => persona.id)
        )
        .count('* as total')
        .firstOrFail()
      const yaSembradas = Number(cuenta.$extras.total)

      // La ventana se cuenta desde ahora y se reparte en 40 tramos iguales, uno por
      // tarea, con un punto al azar dentro de cada tramo: así hay tareas en todo el
      // periodo y ninguna cae en el futuro.
      const ahora = DateTime.now()
      const inicio = ahora.minus({ days: VENTANA_DIAS })
      const tramo = ahora.diff(inicio).as('milliseconds') / TOTAL_TAREAS

      for (let i = yaSembradas; i < TOTAL_TAREAS; i++) {
        const createdAt = inicio.plus({ milliseconds: Math.floor((i + Math.random()) * tramo) })

        // Los casos van en las 20 tareas más antiguas, una de cada dos, para que
        // una fecha pasada tenga sentido en una tarea que ya llevaba tiempo creada.
        const caso = i < 20 && i % 2 === 0 ? CASOS[i / 2] : undefined

        const constructor = TaskFactory.client(trx).merge({
          // 3 es primo con 5: recorre a las cinco personas sin repetir patrón.
          assigneeId: equipo[(i * 3) % equipo.length].id,
          createdAt,
        })

        await (caso ? constructor.apply(caso) : constructor).create()
      }
    })
  }
}
