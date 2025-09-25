import { NextRequest } from 'next/server'

// Helper function to add CORS headers
function addCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*')
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
 * GET /api/health
 * Simple health check endpoint
 */
export async function GET(request: NextRequest) {
  try {
    return addCorsHeaders(Response.json({
      status: 'ok',
      message: 'Backend is running',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || '3000'
    }))
  } catch (error) {
    console.error('Health check error:', error)
    return addCorsHeaders(Response.json({ 
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }))
  }
}