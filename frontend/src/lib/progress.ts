import type { TaskStatus } from '@/lib/types'

/**
 * Cuántas tareas del espacio siguen abiertas (`pending` + `in_progress`) y
 * cuántas están hechas. Son las dos únicas consultas que la API ofrece, y
 * juntas cubren el espacio entero.
 */
export type ProgressCount = {
  open: number
  done: number
}

export function totalOf({ open, done }: ProgressCount): number {
  return open + done
}

/**
 * Porcentaje de hechas, entero y redondeado hacia abajo: así solo vale 100
 * cuando de verdad está todo hecho (199 de 200 es 99, no 100). Sin tareas no
 * hay porcentaje que dar, y 0 es mentir; quien llama no debe pintar nada.
 */
export function donePercent(count: ProgressCount): number {
  const total = totalOf(count)
  if (total === 0) return 0

  return Math.floor((count.done * 100) / total)
}

/**
 * El recuento tras pasar una tarea de un estado a otro. Solo se mueve algo si
 * el cambio cruza la frontera de `done`; entre `pending` e `in_progress` la
 * tarea sigue siendo «abierta» y el resumen no cambia.
 *
 * Para deshacer un cambio basta llamarla con los estados invertidos.
 */
export function moveBetween(
  count: ProgressCount,
  from: TaskStatus,
  to: TaskStatus,
): ProgressCount {
  const wasDone = from === 'done'
  const isDone = to === 'done'

  if (wasDone === isDone) return count

  return isDone
    ? { open: count.open - 1, done: count.done + 1 }
    : { open: count.open + 1, done: count.done - 1 }
}

/** Una tarea nueva siempre nace pendiente: entra por el lado de las abiertas. */
export function withCreated(count: ProgressCount): ProgressCount {
  return { open: count.open + 1, done: count.done }
}
