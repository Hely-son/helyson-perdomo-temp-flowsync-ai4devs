import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { TaskAssignee } from '@/lib/types'

type AssigneeAvatarProps = {
  assignee: Pick<TaskAssignee, 'fullName' | 'initials'> | null
  className?: string
}

/**
 * El avatar del responsable de una tarea: sus iniciales en un círculo.
 *
 * El círculo es el `img` y su etiqueta es el nombre; las iniciales se ocultan
 * a los lectores de pantalla para que el nombre accesible sea exactamente esa
 * etiqueta. Sin responsable, el círculo lo dice: «Sin asignar» y un `?`.
 */
export function AssigneeAvatar({ assignee, className }: AssigneeAvatarProps) {
  const label = assignee ? (assignee.fullName ?? 'Sin nombre') : 'Sin asignar'

  return (
    <Avatar role="img" aria-label={label} className={className}>
      <AvatarFallback
        aria-hidden="true"
        className="bg-muted text-muted-foreground text-xs font-medium"
      >
        {assignee ? assignee.initials : '?'}
      </AvatarFallback>
    </Avatar>
  )
}
