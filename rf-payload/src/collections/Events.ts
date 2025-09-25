import type { CollectionConfig, AccessArgs } from 'payload'

// Access helpers - improved with debugging
const getRole = (u: unknown): string | undefined => (u && typeof u === 'object' ? (u as any).role : undefined)

const isAdminOrTrainer = ({ req: { user } }: AccessArgs) => {
  if (!user) return false
  const role = getRole(user)
  return role === 'admin' || role === 'trainer'
}

const isAdmin = ({ req: { user } }: AccessArgs) => {
  if (!user) return false
  return getRole(user) === 'admin'
}

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'date', 'type', 'location', 'locked'],
  },
  access: {
    read: () => true, // Publicly listable in Phase 1 (can tighten later)
    create: isAdminOrTrainer,
    update: isAdminOrTrainer,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      label: 'Date & Time',
      admin: {
        description: 'Start date & time of the event',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'yyyy-MM-dd HH:mm',
        },
      },
    },
    {
      name: 'location',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Practice', value: 'practice' },
        { label: 'Game', value: 'game' },
        { label: 'Tournament', value: 'tournament' },
        { label: 'Meeting', value: 'meeting' },
      ],
      defaultValue: 'practice',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'locked',
      type: 'checkbox',
      label: 'Locked (attendance finalized)',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'When locked, attendance & edits should be prevented (enforced in custom logic later).',
      },
    },
  ],
  timestamps: true,
}
