import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Input } from './input'

// Sin etiqueta visible a propósito: la historia enseña el campo, no el
// formulario. El `aria-label` es lo que le da nombre accesible.
const meta = {
  title: 'ui/Input',
  component: Input,
  args: {
    type: 'text',
    placeholder: '¿Qué hay que hacer?',
    'aria-label': 'Título de la tarea',
  },
} satisfies Meta<typeof Input>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const Invalid: Story = {
  args: {
    'aria-invalid': true,
    defaultValue: '',
  },
}

// A diferencia de las demás, esta historia no solo se ve: se usa. El campo se
// localiza como lo encuentra quien lo usa (rol y nombre accesible), no por su
// clase, y no hay esperas por tiempo: cada paso de `userEvent` se espera solo.
export const EscribirYBorrar: Story = {
  play: async ({ canvas, userEvent }) => {
    const campo = canvas.getByRole('textbox', { name: 'Título de la tarea' })

    await userEvent.type(campo, 'Revisar el informe')
    await expect(campo).toHaveValue('Revisar el informe')

    await userEvent.clear(campo)
    await expect(campo).toHaveValue('')
  },
}
