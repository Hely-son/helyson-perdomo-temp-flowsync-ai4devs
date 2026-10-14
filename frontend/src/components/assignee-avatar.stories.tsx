import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { AssigneeAvatar } from './assignee-avatar'

const meta = {
  title: 'AssigneeAvatar',
  component: AssigneeAvatar,
} satisfies Meta<typeof AssigneeAvatar>

export default meta

type Story = StoryObj<typeof meta>

// Las iniciales van ocultas a los lectores de pantalla: el nombre accesible del
// `img` es exactamente la etiqueta, sin las iniciales pegadas.
export const WithName: Story = {
  args: {
    assignee: { fullName: 'Ada Lovelace', initials: 'AL' },
  },
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole('img', { name: 'Ada Lovelace' })

    await expect(avatar).toHaveAccessibleName('Ada Lovelace')
    await expect(canvas.getByText('AL')).toBeVisible()
  },
}

export const NoName: Story = {
  args: {
    assignee: { fullName: null, initials: 'AB' },
  },
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole('img', { name: 'Sin nombre' })

    await expect(avatar).toHaveAccessibleName('Sin nombre')
    await expect(canvas.getByText('AB')).toBeVisible()
  },
}

export const Unassigned: Story = {
  args: {
    assignee: null,
  },
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole('img', { name: 'Sin asignar' })

    await expect(avatar).toHaveAccessibleName('Sin asignar')
    await expect(canvas.getByText('?')).toBeVisible()
    // Lo único que se ve dentro del círculo es el `?`: ninguna inicial.
    await expect(avatar).toHaveTextContent(/^\?$/)
  },
}
