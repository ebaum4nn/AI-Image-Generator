import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const res = await pool.query('SELECT id, email, name, credits, role, created_at, updated_at FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { name, email, credits, password, role } = await request.json();
  try {
    let updateQuery = 'UPDATE users SET name = $1, email = $2, credits = $3, role = $4, updated_at = NOW() WHERE id = $5';
    let queryParams = [name, email, credits, role || 'user', id];
    if (password) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE users SET name = $1, email = $2, credits = $3, role = $4, password = $5, updated_at = NOW() WHERE id = $6';
      queryParams = [name, email, credits, role || 'user', hashedPassword, id];
    }
    await pool.query(updateQuery, queryParams);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
