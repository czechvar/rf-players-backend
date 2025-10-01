import { NextRequest } from 'next/server'
import { createCorsResponse, handleOptions } from '@/utils/cors'

// Handle preflight requests
export async function OPTIONS() {
  return handleOptions()
}

/**
 * GET /api/health
 * Simple health check endpoint
 */
export async function GET(request: NextRequest) {
  try {
    return createCorsResponse({
      status: 'ok',
      message: 'Backend is running',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || '3000'
    })
  } catch (error) {
    console.error('Health check error:', error)
    return createCorsResponse({ 
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}