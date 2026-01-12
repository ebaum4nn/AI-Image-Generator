import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

// This API route has been removed. Use backend-nextjs directly for user management.
export async function PUT() {
  return new Response('This endpoint has been removed. Use backend-nextjs directly.', { status: 410 });
}

export async function DELETE() {
  return new Response('This endpoint has been removed. Use backend-nextjs directly.', { status: 410 });
}