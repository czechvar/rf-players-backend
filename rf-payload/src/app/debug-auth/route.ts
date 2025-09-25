import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Extract cookies from request
    const cookies = request.headers.get('cookie') || ''
    
    // Try to get user from session
    const user = await payload.auth({ headers: request.headers })
    
    return Response.json({
      authenticated: !!user?.user,
      user: user?.user ? {
        id: (user.user as any).id,
        email: (user.user as any).email,
        role: (user.user as any).role,
      } : null,
      cookies: cookies.split(';').map(c => c.trim()),
    })
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false,
      user: null,
    })
  }
}