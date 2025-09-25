import type { CollectionConfig, AccessArgs } from 'payload'

type UserRole = 'admin' | 'trainer' | 'player' | 'parent'
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
    group: 'User Management',
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
        { label: 'Parent', value: 'parent' },
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
    {
      name: 'parentId',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: {
        role: { equals: 'parent' }
      },
      admin: { 
        position: 'sidebar',
        condition: (_, siblingData) => siblingData.role === 'player',
        description: 'Link player to their parent account'
      },
    },
    {
      name: 'playerIds',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      filterOptions: {
        role: { equals: 'player' }
      },
      admin: { 
        position: 'sidebar',
        condition: (_, siblingData) => siblingData.role === 'parent',
        description: 'Children managed by this parent'
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ req, doc, operation }) => {
        // Auto-create attendance records for new players for all upcoming events
        if (operation === 'create' && doc.role === 'player' && req.payload) {
          try {
            // Get all future events (events with date >= today)
            const today = new Date()
            const futureEvents = await req.payload.find({
              collection: 'events',
              where: {
                date: { greater_than_equal: today.toISOString() }
              },
              limit: 1000,
              user: req.user,
            })

            // Create attendance records for each future event
            const attendancePromises = futureEvents.docs.map(async (event) => {
              return req.payload.create({
                collection: 'attendance',
                data: {
                  eventId: event.id,
                  playerId: doc.id,
                  status: 'pending',
                  updatedBy: req.user?.id || doc.id,
                  updatedAt: new Date().toISOString(),
                },
                user: req.user,
              })
            })

            await Promise.all(attendancePromises)
          } catch (error) {
            // Log error but don't fail user creation
            console.error('Error creating attendance records for new player:', error)
          }
        }
      }
    ]
  },
  timestamps: true,
}

