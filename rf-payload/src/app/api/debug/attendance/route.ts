import { NextRequest } from 'next/server'
import { createCorsResponse, handleOptions } from '@/utils/cors'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'


export async function OPTIONS() {
  return handleOptions()
}

/**
 * GET /api/debug/attendance
 * Debug endpoint to check attendance data
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return createCorsResponse({ error: 'Unauthorized' }, 401)
    }

    // Get some basic counts
    const eventsCount = await payload.count({
      collection: 'events',
      user,
    })

    const usersCount = await payload.count({
      collection: 'users',
      user,
    })

    const attendanceCount = await payload.count({
      collection: 'attendance',
      user,
    })

    // Get all attendance records for debugging
    const allAttendance = await payload.find({
      collection: 'attendance',
      limit: 10,
      depth: 2,
      user,
    })

    // Get all events
    const allEvents = await payload.find({
      collection: 'events',
      limit: 10,
      user,
    })

    // Get all players
    const allPlayers = await payload.find({
      collection: 'users',
      where: {
        role: { equals: 'player' }
      },
      limit: 10,
      user,
    })

    return createCorsResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      counts: {
        events: eventsCount.totalDocs,
        users: usersCount.totalDocs,
        attendance: attendanceCount.totalDocs
      },
      sample_data: {
        events: allEvents.docs,
        players: allPlayers.docs,
        attendance: allAttendance.docs
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return createCorsResponse({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}