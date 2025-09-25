import type { CollectionConfig, AccessArgs } from 'payload'

// Access helpers
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

const canReadAttendance = ({ req: { user } }: AccessArgs) => {
  if (!user) return false
  const role = getRole(user)
  
  // Admin and trainers can read all attendance records
  if (role === 'admin' || role === 'trainer') return true
  
  // Players and parents can only read their own/children's attendance
  // For now, simplified to player access only - parent access will be handled via custom hooks
  if (role === 'player') {
    return {
      playerId: { equals: user.id }
    }
  }
  
  // Parents - for now allow all, will be filtered in afterRead hook
  if (role === 'parent') {
    return true // Will be filtered in afterRead hook based on parent-child relationships
  }
  
  return false
}

const canUpdateAttendance = ({ req: { user } }: AccessArgs) => {
  if (!user) return false
  const role = getRole(user)
  
  // Admin and trainers can update all attendance records
  if (role === 'admin' || role === 'trainer') return true
  
  // Players can update their own attendance
  if (role === 'player') {
    return {
      playerId: { equals: user.id }
    }
  }
  
  // Parents can update their children's attendance (filtered in beforeChange hook)
  if (role === 'parent') {
    return true // Will be validated in beforeChange hook based on parent-child relationships
  }
  
  return false
}

export const Attendance: CollectionConfig = {
  slug: 'attendance',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['eventId', 'playerId', 'status', 'updatedBy', 'updatedAt'],
    group: 'Event Management',
  },
  access: {
    read: canReadAttendance,
    create: isAdminOrTrainer, // Only admin/trainers create attendance records (via hooks)
    update: canUpdateAttendance,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ req, data, operation }) => {
        // Check if event is locked
        if (data?.eventId && req.payload) {
          try {
            const event = await req.payload.findByID({
              collection: 'events',
              id: data.eventId,
              user: req.user,
            })
            
            if (event?.locked && req.user) {
              const role = getRole(req.user)
              // Only admin can modify attendance for locked events
              if (role !== 'admin') {
                throw new Error('Cannot modify attendance for a locked event. Contact an administrator.')
              }
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('locked')) {
              throw error
            }
            // If event lookup fails, continue with normal validation
          }
        }
        
        // Set updatedBy and updatedAt fields
        if (req.user) {
          data.updatedBy = req.user.id
          data.updatedAt = new Date()
        }

        // Validate status changes based on user role
        if (operation === 'update' && req.user) {
          const role = getRole(req.user)
          
          // Validate parent access to child's attendance
          if (role === 'parent' && req.payload) {
            try {
              const parentUser = await req.payload.findByID({
                collection: 'users',
                id: req.user.id,
              })
              
              const childIds = parentUser.playerIds?.map((p: any) => typeof p === 'object' ? p.id : p) || []
              if (!childIds.includes(data.playerId)) {
                throw new Error('Parents can only modify their own children\'s attendance')
              }
            } catch (error) {
              throw new Error('Unable to verify parent-child relationship')
            }
          }
          
          // Players and parents can only set status to 'attending' or 'declined'
          if ((role === 'player' || role === 'parent') && 
              !['attending', 'declined'].includes(data.status)) {
            throw new Error('Players and parents can only set status to "attending" or "declined"')
          }
          
          // Only admin/trainers can set status to 'attended', 'excused'
          if (!['admin', 'trainer'].includes(role || '') && 
              ['attended', 'excused'].includes(data.status)) {
            throw new Error('Only trainers and admins can mark attendance as "attended" or "excused"')
          }
        }

        return data
      }
    ],
    beforeValidate: [
      async ({ req, data }) => {
        // Prevent changes if the event is locked
        if (data && data.eventId && req.payload) {
          try {
            const event = await req.payload.findByID({
              collection: 'events',
              id: data.eventId,
              user: req.user,
            })
            
            if (event.locked) {
              const role = getRole(req.user)
              // Only admin can modify attendance for locked events
              if (role !== 'admin') {
                throw new Error('Cannot modify attendance for a locked event')
              }
            }
          } catch (error) {
            // Event not found or other error - let it proceed and fail in validation
          }
        }
        
        return data
      }
    ],
    afterRead: [
      async ({ req, doc }) => {
        // Filter attendance records for parents to only show their children's data
        if (req.user && getRole(req.user) === 'parent' && req.payload) {
          try {
            const parentUser = await req.payload.findByID({
              collection: 'users',
              id: req.user.id,
            })
            
            const childIds = parentUser.playerIds?.map((p: any) => typeof p === 'object' ? p.id : p) || []
            
            // If this is an array of docs, filter them
            if (Array.isArray(doc)) {
              return doc.filter((attendance: any) => 
                childIds.includes(typeof attendance.playerId === 'object' ? attendance.playerId.id : attendance.playerId)
              )
            }
            
            // If this is a single doc, check if parent has access
            const playerId = typeof doc.playerId === 'object' ? doc.playerId.id : doc.playerId
            if (!childIds.includes(playerId)) {
              throw new Error('Access denied')
            }
          } catch (error) {
            if (error instanceof Error && error.message === 'Access denied') {
              throw error
            }
            // Log error but don't fail the read operation for other errors
            console.error('Error filtering attendance for parent:', error)
          }
        }
        
        return doc
      }
    ]
  },
  fields: [
    {
      name: 'eventId',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'playerId',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: {
        role: { equals: 'player' }
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Attending', value: 'attending' },
        { label: 'Declined', value: 'declined' },
        { label: 'Attended', value: 'attended' },
        { label: 'Excused', value: 'excused' },
      ],
      defaultValue: 'pending',
      admin: {
        description: 'Players/Parents can set: pending, attending, declined. Trainers/Admins can set all statuses.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Optional notes for trainers/admins',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'User who last updated this record',
      },
    },
    {
      name: 'updatedAt',
      type: 'date',
      required: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Timestamp of last update',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'yyyy-MM-dd HH:mm:ss',
        },
      },
    },
  ],
  timestamps: true,
}