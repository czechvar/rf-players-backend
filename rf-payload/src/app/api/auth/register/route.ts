import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import crypto from 'crypto'
import configPromise from '@/payload.config'
import { createCorsResponse, handleOptions } from '@/utils/cors'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

/**
 * POST /api/auth/register
 * Self-registration for players and parents.
 * Creates an unverified, unapproved user and returns a verification token.
 *
 * Body: { email, password, firstName, lastName, role: 'player' | 'parent', dateOfBirth? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, role, dateOfBirth } = body

    // --- Validation ---
    if (!email || !password || !firstName || !lastName || !role) {
      return createCorsResponse(
        { error: 'Missing required fields: email, password, firstName, lastName, role' },
        400,
        request.headers,
      )
    }

    // Only player and parent can self-register
    if (!['player', 'parent'].includes(role)) {
      return createCorsResponse(
        { error: 'Self-registration is only allowed for player and parent roles' },
        403,
        request.headers,
      )
    }

    // Players must provide dateOfBirth
    if (role === 'player' && !dateOfBirth) {
      return createCorsResponse(
        { error: 'Date of birth is required for player registration' },
        400,
        request.headers,
      )
    }

    const payload = await getPayload({ config: configPromise })

    // Check for existing user with same email
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: email.toLowerCase().trim() } },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      return createCorsResponse(
        { error: 'A user with this email already exists' },
        409,
        request.headers,
      )
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Create user — unapproved & unverified by default (collection defaults)
    const user = await payload.create({
      collection: 'users',
      data: {
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        isApproved: false,
        emailVerified: false,
        verificationToken,
      },
      // Override access: public endpoint needs to set verificationToken which has restricted access
      overrideAccess: true,
    })

    // TODO Phase 3: send verification email with token link
    // For now, return the token in the response so the frontend can navigate directly
    // In production this would be emailed as: /auth/verify?token=<token>

    return createCorsResponse(
      {
        success: true,
        message: 'Registration successful. Please verify your email.',
        userId: user.id,
        // Include token in response for Phase 2 (no email service yet)
        verificationToken,
      },
      201,
      request.headers,
    )
  } catch (error: any) {
    console.error('Registration error:', error)

    // Payload validation errors (e.g. duplicate email via unique index)
    if (error.status === 400 || error.name === 'ValidationError') {
      return createCorsResponse(
        { error: error.message || 'Validation error' },
        400,
        request.headers,
      )
    }

    return createCorsResponse(
      { error: 'Internal server error' },
      500,
      request.headers,
    )
  }
}
