import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, role } = await req.json();
    if (!email || !['admin', 'user'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const res = await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, name, credits, role', [role, email]);
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: res.rows[0] });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
  }
}
