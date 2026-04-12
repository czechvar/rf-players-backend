import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { createCorsResponse, handleOptions } from '@/utils/cors'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

/**
 * POST /api/auth/verify-email
 * Verify a user's email address using the token from registration.
 *
 * Body: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return createCorsResponse(
        { error: 'Verification token is required' },
        400,
        request.headers,
      )
    }

    const payload = await getPayload({ config: configPromise })

    // Find user with matching verification token
    const users = await payload.find({
      collection: 'users',
      where: {
        verificationToken: { equals: token },
      },
      limit: 1,
    })

    if (users.totalDocs === 0) {
      return createCorsResponse(
        { error: 'Invalid or expired verification token' },
        400,
        request.headers,
      )
    }

    const user = users.docs[0]

    // Already verified?
    if (user.emailVerified) {
      return createCorsResponse(
        {
          success: true,
          message: 'Email already verified',
          isApproved: user.isApproved,
        },
        200,
        request.headers,
      )
    }

    // Mark email as verified and clear the token
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        emailVerified: true,
        verificationToken: '', // Clear the token after use
      },
      // Override access so we can clear the token (field access blocks normal updates)
      overrideAccess: true,
    })

    return createCorsResponse(
      {
        success: true,
        message: 'Email verified successfully',
        isApproved: user.isApproved,
      },
      200,
      request.headers,
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return createCorsResponse(
      { error: 'Internal server error' },
      500,
      request.headers,
    )
  }
}
