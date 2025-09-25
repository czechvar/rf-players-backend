import type { CollectionConfig, AccessArgs } from 'payload'

type UserRole = 'admin' | 'trainer' | 'player'
interface AuthUser {
  id: string
  role?: UserRole
}

// Basic role-based helpers (Phase 1: only admin & trainer self-register; players created by staff)
const getRole = (u: unknown): UserRole | undefined => (u && typeof u === 'object' ? (u as any).role : undefined)
const isAdmin = ({ req: { user } }: AccessArgs) => getRole(user) === 'admin'
const isTrainer = ({ req: { user } }: AccessArgs) => getRole(user) === 'trainer'
const isAdminOrTrainer = (args: AccessArgs) => ['admin', 'trainer'].includes(getRole(args.req.user) || '')

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'role'],
  },
  auth: {
    verify: false, // Phase 1: can enable later
  },
  access: {
    read: ({ req }) => {
      // Admin & trainer can read all; user can read self
      if (!req.user) return false
      if (['admin', 'trainer'].includes(getRole(req.user) || '')) return true
      return {
        id: { equals: req.user.id },
      }
    },
    create: () => true, // Allow initial admin/trainer account creation (tighten later if needed)
    update: ({ req }) => {
      if (!req.user) return false
      if ((getRole(req.user) || '') === 'admin') return true
      // Trainers can update players they created (future: track createdBy) + their own profile
      return {
        id: { equals: req.user.id },
      }
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Trainer', value: 'trainer' },
        { label: 'Player', value: 'player' },
        // Parent will arrive in Phase 2
      ],
      defaultValue: 'trainer',
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'dateOfBirth',
      type: 'date',
      admin: { condition: (_, siblingData) => siblingData.role === 'player' },
    },
    {
      name: 'isApproved',
      type: 'checkbox',
      defaultValue: true, // Phase 1 simplify; later require approval flow
      admin: { position: 'sidebar' },
      access: { update: isAdminOrTrainer },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Active (soft delete)',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Uncheck to deactivate user without deleting.' },
      access: { update: isAdminOrTrainer },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      admin: { position: 'sidebar' },
    },
    {
      name: 'phoneNumber',
      type: 'text',
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}

