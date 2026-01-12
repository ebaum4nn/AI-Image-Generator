import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const base = process.env.BACKEND_URL || 'http://backend-nextjs:3000';
    const res = await fetch(`${base}/api/users`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
    }
    const users = await res.json();
    return NextResponse.json({ success: true, users });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Error contacting backend' }, { status: 500 });
  }
}
