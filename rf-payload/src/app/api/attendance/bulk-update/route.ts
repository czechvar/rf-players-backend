import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

/**
 * POST /api/attendance/bulk-update
 * Bulk update attendance records (admin/trainer only)
 */
export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json()
    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to bulk update
    const userRole = user.role
    if (!['admin', 'trainer'].includes(userRole)) {
      return Response.json({ error: 'Forbidden - Admin or Trainer access required' }, { status: 403 })
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return Response.json({ error: 'Invalid updates array' }, { status: 400 })
    }

    // Process each update
    const results = []
    const errors = []

    for (const update of updates) {
      try {
        const { attendanceId, status, notes } = update
        
        if (!attendanceId || !status) {
          errors.push({ update, error: 'Missing attendanceId or status' })
          continue
        }

        const result = await payload.update({
          collection: 'attendance',
          id: attendanceId,
          data: {
            status,
            notes: notes || '',
            updatedBy: user.id,
            updatedAt: new Date().toISOString(),
          },
          user,
        })

        results.push({ attendanceId, success: true, data: result })
      } catch (error) {
        errors.push({ 
          update, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return Response.json({
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: updates.length,
        successful: results.length,
        failed: errors.length
      }
    })
  } catch (error) {
    console.error('Error in bulk attendance update:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/attendance/mark-all
 * Mark all players as attended/excused for an event (admin/trainer only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { eventId, status, notes } = await request.json()
    const payload = await getPayload({ config: configPromise })

    // Get the authenticated user from the request
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    const userRole = user.role
    if (!['admin', 'trainer'].includes(userRole)) {
      return Response.json({ error: 'Forbidden - Admin or Trainer access required' }, { status: 403 })
    }

    if (!eventId || !status) {
      return Response.json({ error: 'Missing eventId or status' }, { status: 400 })
    }

    // Validate status for bulk operations
    if (!['attended', 'excused'].includes(status)) {
      return Response.json({ error: 'Invalid status for bulk operation' }, { status: 400 })
    }

    // Get all attendance records for the event
    const attendanceRecords = await payload.find({
      collection: 'attendance',
      where: {
        eventId: { equals: eventId }
      },
      limit: 1000,
      user,
    })

    const updates = []
    const errors = []

    // Update each attendance record
    for (const record of attendanceRecords.docs) {
      try {
        const result = await payload.update({
          collection: 'attendance',
          id: record.id,
          data: {
            status,
            notes: notes || `Bulk marked as ${status}`,
            updatedBy: user.id,
            updatedAt: new Date().toISOString(),
          },
          user,
        })

        updates.push({ attendanceId: record.id, success: true })
      } catch (error) {
        errors.push({ 
          attendanceId: record.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return Response.json({
      success: errors.length === 0,
      eventId,
      status,
      summary: {
        total: attendanceRecords.docs.length,
        successful: updates.length,
        failed: errors.length
      },
      errors
    })
  } catch (error) {
    console.error('Error in bulk mark attendance:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}