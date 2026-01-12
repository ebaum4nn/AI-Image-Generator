import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { query } from '../../../lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, amount = 1 } = await request.json()

    if (action === 'deduct') {
      // Get user credits from Postgres
      const userRes = await query('SELECT credits FROM users WHERE id = $1', [session.user.id]);
      const user = userRes.rows[0];
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      const currentCredits = user.credits;
      if (currentCredits < amount) {
        return NextResponse.json({ success: false, error: 'Insufficient credits' }, { status: 400 });
      }
      const newCredits = currentCredits - amount;
      await query('UPDATE users SET credits = $1 WHERE id = $2', [newCredits, session.user.id]);
      return NextResponse.json({ success: true, credits: newCredits });
    }

    if (action === 'add') {
      // Get user credits from Postgres
      const userRes = await query('SELECT credits FROM users WHERE id = $1', [session.user.id]);
      const user = userRes.rows[0];
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      const currentCredits = user.credits;
      const newCredits = currentCredits + amount;
      await query('UPDATE users SET credits = $1 WHERE id = $2', [newCredits, session.user.id]);
      return NextResponse.json({ success: true, credits: newCredits });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Credits API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user credits from Postgres
    const userRes = await query('SELECT credits FROM users WHERE id = $1', [session.user.id]);
    const user = userRes.rows[0];
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, credits: user.credits });

  } catch (error) {
    console.error('Credits API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}