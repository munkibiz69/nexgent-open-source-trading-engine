/**
 * Health check endpoint for Railway deployments
 * 
 * GET /api/health
 * 
 * Returns 200 OK when the app is running and ready to serve requests.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
