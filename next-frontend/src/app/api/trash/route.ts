import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-nextjs:3000';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageId } = await request.json();

    if (!imageId || typeof imageId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid image ID' },
        { status: 400 }
      );
    }

    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';

    const res = await fetch(`${BACKEND_URL}/api/images/${imageId}/trash`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.user.id,
        ip_address: ip,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'Failed to trash image' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Image trashed successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}