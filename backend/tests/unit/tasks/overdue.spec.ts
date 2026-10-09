import Task, { type TaskStatus } from '#models/task'
import { test } from '@japa/runner'

/**
 * La regla de «vencida» llamada directamente: `Task.isOverdueOn`, sin servidor y sin
 * base de datos. La tarea se construye en memoria y no se guarda nunca.
 *
 * Es la misma regla que `tests/functional/tasks/overdue.spec.ts` recorre por HTTP
 * (requisito «Cuándo una tarea está vencida» de `openspec/specs/tasks/spec.md`), bajada
 * aquí porque es donde sus bordes salen baratos: tiene que haber fecha, tiene que ser
 * **anterior** al día de referencia, y la tarea no puede estar hecha.
 *
 * El día de referencia es siempre un literal; ningún caso mira el reloj.
 */
test.group('Tasks | regla de vencida', () => {
  const HOY = '2026-08-13'
  const AYER = '2026-08-12'
  const MAÑANA = '2026-08-14'

  function tarea(dueDate: string | null, status: TaskStatus = 'pending') {
    const task = new Task()
    task.dueDate = dueDate
    task.status = status
    return task
  }

  /**
   * El día tal y como lo entrega el driver de PostgreSQL al leer una columna `date`: un
   * `Date` a medianoche **local** de ese día, no un texto. El esquema generado declara
   * `dueDate` como `string`, pero en `config/` no hay ningún parser que convierta ese
   * tipo, así que una tarea leída de la base puede traer esto. El cast es justo lo que
   * el tipo no cuenta.
   */
  function comoLlegaDeLaBase(dia: string) {
    const [anio, mes, dd] = dia.split('-').map(Number)
    return new Date(anio, mes - 1, dd) as unknown as string
  }

  test('una fecha anterior al día de referencia, sin estar hecha, está vencida', ({ assert }) => {
    assert.isTrue(tarea(AYER, 'pending').isOverdueOn(HOY), 'pending')
    assert.isTrue(tarea(AYER, 'in_progress').isOverdueOn(HOY), 'in_progress')
  })

  test('vencer exactamente el día de referencia todavía no es estar vencida', ({ assert }) => {
    assert.isFalse(tarea(HOY).isOverdueOn(HOY))
  })

  test('una fecha posterior al día de referencia no está vencida', ({ assert }) => {
    assert.isFalse(tarea(MAÑANA).isOverdueOn(HOY))
  })

  test('sin fecha no se vence nunca', ({ assert }) => {
    assert.isFalse(tarea(null).isOverdueOn(HOY))
    assert.isFalse(tarea(null).isOverdueOn('2099-12-31'))
  })

  test('una tarea hecha con la fecha ya pasada no está vencida', ({ assert }) => {
    assert.isFalse(tarea(AYER, 'done').isOverdueOn(HOY))
  })

  test('da lo mismo recibir la fecha como texto que como objeto de fecha', ({ assert }) => {
    const casos: Array<[string, string, boolean]> = [
      ['anterior', AYER, true],
      ['el mismo día', HOY, false],
      ['posterior', MAÑANA, false],
    ]

    for (const [relacion, dia, esperado] of casos) {
      const comoTexto = tarea(dia).isOverdueOn(HOY)
      const comoFecha = tarea(comoLlegaDeLaBase(dia)).isOverdueOn(HOY)

      assert.equal(comoTexto, esperado, `${relacion}, como texto`)
      assert.equal(comoFecha, esperado, `${relacion}, como objeto de fecha`)
    }
  })
})
