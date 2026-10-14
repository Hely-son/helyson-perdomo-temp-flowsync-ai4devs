import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlertCircleIcon, InfoIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from './alert'

const meta = {
  title: 'ui/Alert',
  component: Alert,
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <>
        <InfoIcon />
        <AlertTitle>Tarea creada</AlertTitle>
        <AlertDescription>
          «Revisar el informe» se ha creado como pendiente.
        </AlertDescription>
      </>
    ),
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: (
      <>
        <AlertCircleIcon />
        <AlertTitle>No se ha podido cambiar el estado</AlertTitle>
        <AlertDescription>
          Inténtalo de nuevo en unos segundos.
        </AlertDescription>
      </>
    ),
  },
}

export const LongText: Story = {
  args: {
    variant: 'default',
    children: (
      <>
        <InfoIcon />
        <AlertTitle>Esta tarea ya no aparece en la vista actual</AlertTitle>
        <AlertDescription>
          «Preparar la presentación trimestral para el comité de dirección, con
          los resultados de las tres áreas y el calendario de las próximas
          entregas» ha pasado a «Hecho» y ya no aparece en esta vista. Sigue
          existiendo: acota la lista por «Hecho» para volver a verla, o cambia
          su estado si la marcaste por error.
        </AlertDescription>
      </>
    ),
  },
}
