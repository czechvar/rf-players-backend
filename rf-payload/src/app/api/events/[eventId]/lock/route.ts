import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

// Helper function to add CORS headers
function addCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', 'http://127.0.0.1:4000')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Handle preflight requests
export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }))
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
      return addCorsHeaders(Response.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    // Only admin and trainer can lock events
    if (!['admin', 'trainer'].includes(user.role)) {
      return addCorsHeaders(Response.json({ error: 'Insufficient permissions' }, { status: 403 }))
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

    return addCorsHeaders(Response.json({
      success: true,
      message: 'Event locked successfully',
      event: updatedEvent,
    }))
  } catch (error) {
    console.error('Error locking event:', error)
    
    if (error instanceof Error) {
      return addCorsHeaders(Response.json({ error: error.message }, { status: 400 }))
    }
    
    return addCorsHeaders(Response.json({ error: 'Internal server error' }, { status: 500 }))
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
      return addCorsHeaders(Response.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    // Only admin and trainer can unlock events
    if (!['admin', 'trainer'].includes(user.role)) {
      return addCorsHeaders(Response.json({ error: 'Insufficient permissions' }, { status: 403 }))
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

    return addCorsHeaders(Response.json({
      success: true,
      message: 'Event unlocked successfully',
      event: updatedEvent,
    }))
  } catch (error) {
    console.error('Error unlocking event:', error)
    
    if (error instanceof Error) {
      return addCorsHeaders(Response.json({ error: error.message }, { status: 400 }))
    }
    
    return addCorsHeaders(Response.json({ error: 'Internal server error' }, { status: 500 }))
  }
}