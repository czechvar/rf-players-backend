import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

// Helper function to add CORS headers
function addCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*')
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
 * GET /api/events/[eventId]/attendance
 * Get all attendance records for a specific event
 */
export async function GET(
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

    // Get attendance records for the event
    const attendance = await payload.find({
      collection: 'attendance',
      where: {
        eventId: { equals: eventId }
      },
      depth: 2, // Include user and event details
      user,
    })

    return addCorsHeaders(Response.json(attendance))
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return addCorsHeaders(Response.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

/**
 * PATCH /api/events/[eventId]/attendance
 * Update attendance status for the current user or their child
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { playerId, status, notes } = await request.json()
    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return addCorsHeaders(Response.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    // Find the attendance record
    const attendanceRecords = await payload.find({
      collection: 'attendance',
      where: {
        and: [
          { eventId: { equals: eventId } },
          { playerId: { equals: playerId } }
        ]
      },
      user,
    })

    if (attendanceRecords.docs.length === 0) {
      return addCorsHeaders(Response.json({ error: 'Attendance record not found' }, { status: 404 }))
    }

    const attendanceId = attendanceRecords.docs[0].id

    // Update the attendance record
    const updatedAttendance = await payload.update({
      collection: 'attendance',
      id: attendanceId,
      data: {
        status,
        notes,
        updatedBy: user.id,
        updatedAt: new Date().toISOString(),
      },
      user,
    })

    return addCorsHeaders(Response.json(updatedAttendance))
  } catch (error) {
    console.error('Error updating attendance:', error)
    
    if (error instanceof Error) {
      return addCorsHeaders(Response.json({ error: error.message }, { status: 400 }))
    }
    
    return addCorsHeaders(Response.json({ error: 'Internal server error' }, { status: 500 }))
  }
}