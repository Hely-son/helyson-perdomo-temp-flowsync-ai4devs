import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'
import User from '#models/user'

/**
 * Dominio de los correos de desarrollo. `.example` es un TLD reservado (RFC 2606):
 * ninguna de estas direcciones puede existir de verdad ni llegar a nadie.
 */
export const DOMINIO_DEMO = 'flowsync.example'

/**
 * Todas las cuentas de desarrollo entran con esta contraseña. Se pasa en claro: la
 * cifra el mixin `withAuthFinder` del modelo al guardar, igual que en el registro.
 * Cumple las reglas del validador de alta (8 a 32 caracteres).
 */
export const PASSWORD_DEMO = 'flowsync-demo'

const NOMBRES = [
  'Lucía',
  'Mateo',
  'Valentina',
  'Iker',
  'Carmen',
  'Hugo',
  'Noa',
  'Álvaro',
  'Marta',
  'Sergio',
  'Irene',
  'Daniel',
  'Paula',
  'Adrián',
  'Elena',
  'Pablo',
  'Nuria',
  'Javier',
  'Claudia',
  'Rubén',
  'Alba',
  'Gonzalo',
  'Inés',
  'Raúl',
  'Sofía',
  'Marcos',
  'Ainhoa',
  'Óscar',
  'Teresa',
  'Julián',
]

const APELLIDOS = [
  'Fernández',
  'Ortega',
  'Navarro',
  'Molina',
  'Ibáñez',
  'Castillo',
  'Vidal',
  'Serrano',
  'Cabrera',
  'Domínguez',
  'Rojas',
  'Peña',
  'Herrero',
  'Santana',
  'Lozano',
  'Prieto',
  'Marín',
  'Carrasco',
  'Iglesias',
  'Bravo',
  'Montero',
  'Gallego',
  'Soler',
  'Medina',
  'Campos',
  'Esteban',
  'Cortés',
  'Vega',
  'Nieto',
  'Arroyo',
]

/**
 * El correo se deriva del nombre: sin tildes, en minúsculas y con puntos entre las
 * palabras. Es una sola función para que quien escriba un nombre a mano (el seeder)
 * obtenga el mismo correo que obtendría la factory.
 */
export function emailPara(fullName: string) {
  const local = fullName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .join('.')
    .replace(/[^a-z0-9.]/g, '')

  return `${local}@${DOMINIO_DEMO}`
}

/**
 * Una persona registrada. Lo que el esquema deja pasar y la factory no:
 *
 * - **Con nombre y apellido.** `full_name` es nulable en la base, pero el registro
 *   pide nombre (RF-1) y la lista identifica al responsable por su nombre, no por
 *   su correo (E3-1 CA-6).
 * - **Correo de ejemplo.** Siempre en `DOMINIO_DEMO`; la unicidad sí la impone el
 *   esquema. Con 30 nombres x 30 apellidos x 30 apellidos, chocar al azar es raro,
 *   y si ocurre falla alto (violación de unicidad), no en silencio.
 * - **Alta anterior a la ventana de las tareas.** Entre 91 y 120 días atrás, para que
 *   ninguna tarea de los últimos 90 días sea anterior a la cuenta de su responsable
 *   (RF-1, RF-7: el responsable ya está registrado cuando recibe la tarea).
 * - **Sin rastro de presencia.** Ni sesiones ni tokens ni «visto por última vez»
 *   (RF-22, RNF-7): la factory no los crea y el esquema tampoco los tiene.
 */
export const UserFactory = factory
  .define(User, ({ faker }) => {
    const fullName = [
      faker.helpers.arrayElement(NOMBRES),
      faker.helpers.arrayElement(APELLIDOS),
      faker.helpers.arrayElement(APELLIDOS),
    ].join(' ')

    const alta = DateTime.now().minus({ days: faker.number.int({ min: 91, max: 120 }) })

    return {
      fullName,
      email: emailPara(fullName),
      password: PASSWORD_DEMO,
      createdAt: alta,
      // Sin esto, `autoUpdate` la pondría a «ahora» en el insert, y una cuenta de hace
      // cuatro meses figuraría modificada hoy.
      updatedAt: alta,
    }
  })
  .build()
