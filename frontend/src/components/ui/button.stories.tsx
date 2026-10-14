import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlusIcon } from 'lucide-react'

import { Button } from './button'

const meta = {
  title: 'ui/Button',
  component: Button,
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

// Una historia por cada combinación de variante y tamaño que declara el cva
// de `button.tsx`: 6 variantes × 8 tamaños. Los tamaños `icon*` son
// cuadrados, así que llevan un icono y un `aria-label` en vez de texto.

export const DefaultDefault: Story = {
  args: {
    variant: 'default',
    size: 'default',
    children: 'Guardar',
  },
}

export const DefaultXs: Story = {
  args: {
    variant: 'default',
    size: 'xs',
    children: 'Guardar',
  },
}

export const DefaultSm: Story = {
  args: {
    variant: 'default',
    size: 'sm',
    children: 'Guardar',
  },
}

export const DefaultLg: Story = {
  args: {
    variant: 'default',
    size: 'lg',
    children: 'Guardar',
  },
}

export const DefaultIcon: Story = {
  args: {
    variant: 'default',
    size: 'icon',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const DefaultIconXs: Story = {
  args: {
    variant: 'default',
    size: 'icon-xs',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const DefaultIconSm: Story = {
  args: {
    variant: 'default',
    size: 'icon-sm',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const DefaultIconLg: Story = {
  args: {
    variant: 'default',
    size: 'icon-lg',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const DestructiveDefault: Story = {
  args: {
    variant: 'destructive',
    size: 'default',
    children: 'Guardar',
  },
}

export const DestructiveXs: Story = {
  args: {
    variant: 'destructive',
    size: 'xs',
    children: 'Guardar',
  },
}

export const DestructiveSm: Story = {
  args: {
    variant: 'destructive',
    size: 'sm',
    children: 'Guardar',
  },
}

export const DestructiveLg: Story = {
  args: {
    variant: 'destructive',
    size: 'lg',
    children: 'Guardar',
  },
}

export const DestructiveIcon: Story = {
  args: {
    variant: 'destructive',
    size: 'icon',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const DestructiveIconXs: Story = {
  args: {
    variant: 'destructive',
    size: 'icon-xs',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const DestructiveIconSm: Story = {
  args: {
    variant: 'destructive',
    size: 'icon-sm',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const DestructiveIconLg: Story = {
  args: {
    variant: 'destructive',
    size: 'icon-lg',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const OutlineDefault: Story = {
  args: {
    variant: 'outline',
    size: 'default',
    children: 'Guardar',
  },
}

export const OutlineXs: Story = {
  args: {
    variant: 'outline',
    size: 'xs',
    children: 'Guardar',
  },
}

export const OutlineSm: Story = {
  args: {
    variant: 'outline',
    size: 'sm',
    children: 'Guardar',
  },
}

export const OutlineLg: Story = {
  args: {
    variant: 'outline',
    size: 'lg',
    children: 'Guardar',
  },
}

export const OutlineIcon: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const OutlineIconXs: Story = {
  args: {
    variant: 'outline',
    size: 'icon-xs',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const OutlineIconSm: Story = {
  args: {
    variant: 'outline',
    size: 'icon-sm',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const OutlineIconLg: Story = {
  args: {
    variant: 'outline',
    size: 'icon-lg',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const SecondaryDefault: Story = {
  args: {
    variant: 'secondary',
    size: 'default',
    children: 'Guardar',
  },
}

export const SecondaryXs: Story = {
  args: {
    variant: 'secondary',
    size: 'xs',
    children: 'Guardar',
  },
}

export const SecondarySm: Story = {
  args: {
    variant: 'secondary',
    size: 'sm',
    children: 'Guardar',
  },
}

export const SecondaryLg: Story = {
  args: {
    variant: 'secondary',
    size: 'lg',
    children: 'Guardar',
  },
}

export const SecondaryIcon: Story = {
  args: {
    variant: 'secondary',
    size: 'icon',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const SecondaryIconXs: Story = {
  args: {
    variant: 'secondary',
    size: 'icon-xs',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const SecondaryIconSm: Story = {
  args: {
    variant: 'secondary',
    size: 'icon-sm',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const SecondaryIconLg: Story = {
  args: {
    variant: 'secondary',
    size: 'icon-lg',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const GhostDefault: Story = {
  args: {
    variant: 'ghost',
    size: 'default',
    children: 'Guardar',
  },
}

export const GhostXs: Story = {
  args: {
    variant: 'ghost',
    size: 'xs',
    children: 'Guardar',
  },
}

export const GhostSm: Story = {
  args: {
    variant: 'ghost',
    size: 'sm',
    children: 'Guardar',
  },
}

export const GhostLg: Story = {
  args: {
    variant: 'ghost',
    size: 'lg',
    children: 'Guardar',
  },
}

export const GhostIcon: Story = {
  args: {
    variant: 'ghost',
    size: 'icon',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const GhostIconXs: Story = {
  args: {
    variant: 'ghost',
    size: 'icon-xs',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const GhostIconSm: Story = {
  args: {
    variant: 'ghost',
    size: 'icon-sm',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const GhostIconLg: Story = {
  args: {
    variant: 'ghost',
    size: 'icon-lg',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const LinkDefault: Story = {
  args: {
    variant: 'link',
    size: 'default',
    children: 'Guardar',
  },
}

export const LinkXs: Story = {
  args: {
    variant: 'link',
    size: 'xs',
    children: 'Guardar',
  },
}

export const LinkSm: Story = {
  args: {
    variant: 'link',
    size: 'sm',
    children: 'Guardar',
  },
}

export const LinkLg: Story = {
  args: {
    variant: 'link',
    size: 'lg',
    children: 'Guardar',
  },
}

export const LinkIcon: Story = {
  args: {
    variant: 'link',
    size: 'icon',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const LinkIconXs: Story = {
  args: {
    variant: 'link',
    size: 'icon-xs',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const LinkIconSm: Story = {
  args: {
    variant: 'link',
    size: 'icon-sm',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}

export const LinkIconLg: Story = {
  args: {
    variant: 'link',
    size: 'icon-lg',
    children: <PlusIcon />,
    'aria-label': 'Añadir',
  },
}
