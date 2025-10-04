import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { createCorsResponse, handleOptions } from '@/utils/cors'

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

/**
 * POST /api/events/[eventId]/lock
 * Lock an event to prevent further registrations and protect from deletion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return createCorsResponse({ error: 'Unauthorized' }, 401, request.headers)
    }

    // Only admin and trainer can lock events
    if (!['admin', 'trainer'].includes(user.role)) {
      return createCorsResponse({ error: 'Insufficient permissions' }, 403, request.headers)
    }

    // Update the event to set locked = true
    const updatedEvent = await payload.update({
      collection: 'events',
      id: eventId,
      data: {
        locked: true,
      },
      user,
    })

    return createCorsResponse({
      success: true,
      message: 'Event locked successfully',
      event: updatedEvent,
    }, 200, request.headers)
  } catch (error) {
    console.error('Error locking event:', error)
    
    if (error instanceof Error) {
      return createCorsResponse({ error: error.message }, 400, request.headers)
    }
    
    return createCorsResponse({ error: 'Internal server error' }, 500, request.headers)
  }
}

/**
 * DELETE /api/events/[eventId]/lock
 * Unlock an event to allow registrations and edits again
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return createCorsResponse({ error: 'Unauthorized' }, 401, request.headers)
    }

    // Only admin and trainer can unlock events
    if (!['admin', 'trainer'].includes(user.role)) {
      return createCorsResponse({ error: 'Insufficient permissions' }, 403, request.headers)
    }

    // Update the event to set locked = false
    const updatedEvent = await payload.update({
      collection: 'events',
      id: eventId,
      data: {
        locked: false,
      },
      user,
    })

    return createCorsResponse({
      success: true,
      message: 'Event unlocked successfully',
      event: updatedEvent,
    }, 200, request.headers)
  } catch (error) {
    console.error('Error unlocking event:', error)
    
    if (error instanceof Error) {
      return createCorsResponse({ error: error.message }, 400, request.headers)
    }
    
    return createCorsResponse({ error: 'Internal server error' }, 500, request.headers)
  }
}