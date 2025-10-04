import { NextRequest } from 'next/server'
import { createCorsResponse, handleOptions } from '@/utils/cors'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
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
      return createCorsResponse({ error: 'Unauthorized' }, 401, request.headers)
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

    return createCorsResponse(attendance, 200, request.headers)
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return createCorsResponse({ error: 'Internal server error' }, 500, request.headers)
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
      return createCorsResponse({ error: 'Unauthorized' }, 401, request.headers)
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
      return createCorsResponse({ error: 'Attendance record not found' }, 404, request.headers)
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

    return createCorsResponse(updatedAttendance, 200, request.headers)
  } catch (error) {
    console.error('Error updating attendance:', error)
    
    if (error instanceof Error) {
      return createCorsResponse({ error: error.message }, 400, request.headers)
    }
    
    return createCorsResponse({ error: 'Internal server error' }, 500, request.headers)
  }
}