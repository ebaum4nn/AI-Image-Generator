import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-nextjs:3000';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { ip_address } = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/images/${id}/trash`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.user.id,
        ip_address: ip_address || request.headers.get('x-forwarded-for') || 'unknown',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json(errorData, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error trashing image:', error);
    return NextResponse.json({ error: 'Failed to trash image' }, { status: 500 });
  }
}