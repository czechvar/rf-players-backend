import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { createCorsResponse, handleOptions } from '@/utils/cors'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

/**
 * POST /api/auth/approve
 * Approve (or reject) a pending user registration. Admin/trainer only.
 *
 * Body: { userId: string, approved: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    // Authenticate caller
    const { user: caller } = await payload.auth({ headers: request.headers })
    if (!caller) {
      return createCorsResponse({ error: 'Unauthorized' }, 401, request.headers)
    }

    if (!['admin', 'trainer'].includes((caller as any).role)) {
      return createCorsResponse({ error: 'Forbidden — admin or trainer access required' }, 403, request.headers)
    }

    const { userId, approved } = await request.json()

    if (!userId || typeof approved !== 'boolean') {
      return createCorsResponse(
        { error: 'Missing required fields: userId (string), approved (boolean)' },
        400,
        request.headers,
      )
    }

    // Fetch the target user
    const targetUser = await payload.findByID({ collection: 'users', id: userId })
    if (!targetUser) {
      return createCorsResponse({ error: 'User not found' }, 404, request.headers)
    }

    if (approved) {
      // Approve: set isApproved = true
      await payload.update({
        collection: 'users',
        id: userId,
        data: { isApproved: true },
        overrideAccess: true,
      })

      return createCorsResponse(
        { success: true, message: 'User approved', userId },
        200,
        request.headers,
      )
    } else {
      // Reject: deactivate the user (soft delete)
      await payload.update({
        collection: 'users',
        id: userId,
        data: { active: false, isApproved: false },
        overrideAccess: true,
      })

      return createCorsResponse(
        { success: true, message: 'User rejected and deactivated', userId },
        200,
        request.headers,
      )
    }
  } catch (error) {
    console.error('Approval error:', error)
    return createCorsResponse({ error: 'Internal server error' }, 500, request.headers)
  }
}

/**
 * GET /api/auth/approve
 * List pending users (email verified but not approved). Admin/trainer only.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    const { user: caller } = await payload.auth({ headers: request.headers })
    if (!caller) {
      return createCorsResponse({ error: 'Unauthorized' }, 401, request.headers)
    }

    if (!['admin', 'trainer'].includes((caller as any).role)) {
      return createCorsResponse({ error: 'Forbidden' }, 403, request.headers)
    }

    const pending = await payload.find({
      collection: 'users',
      where: {
        and: [
          { isApproved: { equals: false } },
          { emailVerified: { equals: true } },
          { active: { equals: true } },
        ],
      },
      sort: '-createdAt',
      limit: 100,
    })

    return createCorsResponse(
      { docs: pending.docs, totalDocs: pending.totalDocs },
      200,
      request.headers,
    )
  } catch (error) {
    console.error('Pending users fetch error:', error)
    return createCorsResponse({ error: 'Internal server error' }, 500, request.headers)
  }
}
