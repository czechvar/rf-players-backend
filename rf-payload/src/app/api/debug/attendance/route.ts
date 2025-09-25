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
 * GET /api/debug/attendance
 * Debug endpoint to check attendance data
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return addCorsHeaders(Response.json({ error: 'Unauthorized' }, { status: 401 }))
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

    return addCorsHeaders(Response.json({
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
    }))
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return addCorsHeaders(Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }))
  }
}