import { NextResponse } from 'next/server'

/**
 * Helper function to create response with CORS headers
 * Compatible with Vercel hosting and edge runtime
 */
export function createCorsResponse(data: any, status: number = 200) {
  const response = NextResponse.json(data, { status })
  
  // Use specific origins in production, wildcard only for development
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*']
  const origin = allowedOrigins[0] === '*' ? '*' : allowedOrigins[0]
  
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  
  return response
}

/**
 * Standard OPTIONS handler for preflight requests
 */
export function handleOptions() {
  return createCorsResponse(null)
}
