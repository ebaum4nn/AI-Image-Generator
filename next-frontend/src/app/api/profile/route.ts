import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { query } from '@/lib/db';


// GET: Get current user profile
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await query('SELECT name, email, image FROM users WHERE email = $1', [session.user.email]);
  const user = result.rows[0];
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  // Split name into first and last name for backward compatibility
  const nameParts = (user.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  return NextResponse.json({
    firstName,
    lastName,
    birthdate: '', // Not stored in current schema
    email: user.email,
    image: user.image || '',
  });
}


// POST: Update user profile
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { firstName, lastName, birthdate, email } = await req.json();
  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  try {
    // Combine first and last name into a single name field
    const fullName = `${firstName} ${lastName}`.trim();
    // Update user profile
    const updateRes = await query(
      'UPDATE users SET name = $1, email = $2 WHERE email = $3 RETURNING name, email, image',
      [fullName, email, session.user.email]
    );
    const user = updateRes.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Split name back into first and last for response
    const nameParts = (user.name || '').split(' ');
    const responseFirstName = nameParts[0] || '';
    const responseLastName = nameParts.slice(1).join(' ') || '';
    return NextResponse.json({
      success: true,
      user: {
        firstName: responseFirstName,
        lastName: responseLastName,
        birthdate: '', // Not stored in current schema
        email: user.email,
        image: user.image || '',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
