import { NextResponse } from 'next/server'

/**
 * Helper function to create response with CORS headers
 * Compatible with Vercel hosting and edge runtime
 */
export function createCorsResponse(data: any, status: number = 200, requestHeaders?: Headers) {
  const response = NextResponse.json(data, { status })
  
  // Get the request origin
  const requestOrigin = requestHeaders?.get('origin') || requestHeaders?.get('Origin')
  
  // Define allowed origins
  const isDevelopment = process.env.NODE_ENV === 'development'
  const defaultAllowedOrigins = isDevelopment ? ['http://localhost:3000', 'http://localhost:4000'] : []
  const allowedOrigins = [
    ...defaultAllowedOrigins,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [])
  ]
  
  console.log('CORS Debug:', { 
    requestOrigin, 
    allowedOrigins, 
    isDevelopment,
    nodeEnv: process.env.NODE_ENV,
    allowedOriginsEnv: process.env.ALLOWED_ORIGINS 
  })
  
  // Determine which origin to allow
  let allowOrigin = '*'
  
  if (requestOrigin && allowedOrigins.length > 0) {
    // Check if the request origin is in our allowed list
    if (allowedOrigins.includes(requestOrigin)) {
      allowOrigin = requestOrigin
    } else if (!isDevelopment) {
      // In production, be strict about origins
      allowOrigin = 'null' // This will block the request
    }
  }
  
  response.headers.set('Access-Control-Allow-Origin', allowOrigin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Vary', 'Origin')
  
  return response
}

/**
 * Standard OPTIONS handler for preflight requests
 */
export function handleOptions(request?: Request) {
  return createCorsResponse(null, 200, request?.headers)
}
