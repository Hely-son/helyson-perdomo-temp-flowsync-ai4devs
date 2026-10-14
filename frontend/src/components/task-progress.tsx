import { Progress } from '@/components/ui/progress'
import { donePercent, totalOf, type ProgressCount } from '@/lib/progress'

type TaskProgressProps = {
  count: ProgressCount
}

/**
 * Cuánto del espacio está hecho, con los números a la vista y la barra como
 * refuerzo. El texto lleva toda la información —por eso es él quien se
 * anuncia a un lector de pantalla y la barra queda fuera—, y la barra solo
 * deja ver de un vistazo si la cosa va por la mitad o está casi.
 *
 * Quien lo usa decide cuándo no pintarlo (espacio sin tareas): aquí un
 * «0 de 0» no tendría sentido y no se contempla.
 */
export function TaskProgress({ count }: TaskProgressProps) {
  const total = totalOf(count)
  const percent = donePercent(count)

  return (
    <div className="bg-background mb-6 rounded-lg border p-4">
      <div className="mb-3 flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">Progreso del equipo</span>
        <p
          className="text-muted-foreground text-right"
          role="status"
          aria-live="polite"
        >
          <span className="text-foreground font-medium">
            {count.done} de {total}
          </span>{' '}
          {total === 1 ? 'hecha' : 'hechas'} · {percent}&nbsp;%
        </p>
      </div>
      {/* Desviación declarada: el azul de la barra va a pelo (`bg-blue-600`), por
          petición expresa, y no con un token del tema. El catálogo no se toca:
          el relleno es un hijo con `data-slot="progress-indicator"` y se pisa
          desde aquí con un selector de hijo directo. */}
      <Progress
        value={percent}
        aria-hidden="true"
        className="*:data-[slot=progress-indicator]:bg-blue-600"
      />
    </div>
  )
}
