import { Progress } from '@/components/ui/progress'
import type { Task } from '@/lib/types'

type TaskProgressProps = {
  /** Las tareas que están en pantalla ahora mismo, ya filtradas. */
  tasks: readonly Task[]
}

/**
 * Qué parte de lo que se está viendo está hecho. La barra es la del catálogo;
 * aquí solo se cuenta y se pone en palabras, porque una barra sin número no
 * se lee con un lector de pantalla ni de un vistazo.
 */
export function TaskProgress({ tasks }: TaskProgressProps) {
  const total = tasks.length
  const done = tasks.filter((task) => task.status === 'done').length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="mb-4 grid gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span id="task-progress-label" className="font-medium">
          Hechas
        </span>
        <span className="text-muted-foreground">
          {done} de {total} · {percent} %
        </span>
      </div>
      <Progress
        value={percent}
        aria-labelledby="task-progress-label"
        className="bg-[#3b82f6]/20 [&>[data-slot=progress-indicator]]:bg-[#3b82f6]"
      />
    </div>
  )
}
