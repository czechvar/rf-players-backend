import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { createCorsResponse, handleOptions } from '@/utils/cors'

// Handle preflight requests
export async function OPTIONS() {
  return handleOptions()
}

/**
 * GET /api/attendance/summary
 * Get attendance summary for events (admin/trainer only)
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return createCorsResponse({ error: 'Unauthorized' }, 401)
    }

    // Check if user has permission to view attendance summary
    const userRole = user.role
    if (!['admin', 'trainer'].includes(userRole)) {
      return createCorsResponse({ error: 'Forbidden - Admin or Trainer access required' }, 403)
    }

    const url = new URL(request.url)
    const eventId = url.searchParams.get('eventId')

    let whereCondition = {}
    if (eventId) {
      whereCondition = { eventId: { equals: eventId } }
    }

    // Get all attendance records with populated event and player data
    const attendance = await payload.find({
      collection: 'attendance',
      where: whereCondition,
      depth: 2,
      limit: 1000, // Adjust based on needs
      sort: '-updatedAt',
      user,
    })

    // Group attendance by event for summary
    const eventSummary: Record<string, any> = {}

    attendance.docs.forEach((record: any) => {
      const eventId = typeof record.eventId === 'object' ? record.eventId.id : record.eventId
      const eventName = typeof record.eventId === 'object' ? record.eventId.name : 'Unknown Event'
      
      if (!eventSummary[eventId]) {
        eventSummary[eventId] = {
          eventId,
          eventName,
          eventDate: typeof record.eventId === 'object' ? record.eventId.date : null,
          total: 0,
          attended: 0,
          attending: 0,
          declined: 0,
          pending: 0,
          excused: 0,
          records: []
        }
      }

      eventSummary[eventId].total++
      eventSummary[eventId][record.status] = (eventSummary[eventId][record.status] || 0) + 1
      eventSummary[eventId].records.push({
        id: record.id,
        playerId: typeof record.playerId === 'object' ? record.playerId.id : record.playerId,
        playerName: typeof record.playerId === 'object' 
          ? `${record.playerId.firstName} ${record.playerId.lastName}`
          : 'Unknown Player',
        status: record.status,
        notes: record.notes,
        updatedAt: record.updatedAt,
        updatedBy: typeof record.updatedBy === 'object'
          ? `${record.updatedBy.firstName} ${record.updatedBy.lastName}`
          : 'Unknown User'
      })
    })

    return createCorsResponse({
      summary: Object.values(eventSummary),
      totalRecords: attendance.totalDocs
    })
  } catch (error) {
    console.error('Error fetching attendance summary:', error)
    return createCorsResponse({ error: 'Internal server error' }, 500)
  }
}