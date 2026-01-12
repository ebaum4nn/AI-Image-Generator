import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '25', 10), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
    const sortKey = (url.searchParams.get('sort_key') || 'created_at').toLowerCase();
    const sortDir = (url.searchParams.get('sort_dir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const allowedSort = new Set([
      'id', 'email', 'name', 'credits', 'credits_used_total', 'role', 'created_at', 'updated_at'
    ]);
    const sortColumn = allowedSort.has(sortKey) ? sortKey : 'created_at';

    const filters: string[] = [];
    const params: any[] = [];
    let pIndex = 1;
    if (q) {
      filters.push(`(u.email ILIKE $${pIndex} OR u.name ILIKE $${pIndex})`);
      params.push(`%${q}%`);
      pIndex++;
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Total count for pagination
    const countSql = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Items with aggregate credits_used_total
    const itemsParams = params.slice();
    const limitIndex = pIndex;
    const offsetIndex = pIndex + 1;
    itemsParams.push(limit);
    itemsParams.push(offset);

    // Map sort column to SQL expression to allow credits_used_total ordering
    const sortExpr = sortColumn === 'credits_used_total' ? 'credits_used_total' : `u.${sortColumn}`;

    const itemsSql = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.credits,
        u.role,
        u.created_at,
        u.updated_at,
        COALESCE(SUM(ig.credits_used), 0) AS credits_used_total
      FROM users u
      LEFT JOIN image_generations ig ON ig.user_id = u.id AND (ig.trashed IS NOT TRUE)
      ${whereClause}
      GROUP BY u.id, u.email, u.name, u.credits, u.role, u.created_at, u.updated_at
      ORDER BY ${sortExpr} ${sortDir}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;
    const itemsRes = await pool.query(itemsSql, itemsParams);
    return NextResponse.json({ items: itemsRes.rows, total });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { email, name, password, credits, role } = await request.json();
  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
  }
  if (!/[A-Z]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one uppercase letter' }, { status: 400 });
  }
  if (!/[a-z]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one lowercase letter' }, { status: 400 });
  }
  if (!/\d/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one special character (!@#$%^&*)' }, { status: 400 });
  }
  try {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, name, password, credits, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, email, name, credits, role',
      [email, name, hashedPassword, credits || 0, role || 'user']
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
