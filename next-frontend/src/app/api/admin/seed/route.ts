import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST() {
  try {
    const adminExists = await pool.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (adminExists.rowCount && adminExists.rowCount > 0) {
      return NextResponse.json({ success: false, error: 'Admin already exists' }, { status: 400 });
    }

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Admin';

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'ADMIN_EMAIL and ADMIN_PASSWORD env vars are required' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const res = await pool.query(
      "INSERT INTO users (email, name, password, credits, role, created_at, updated_at) VALUES ($1, $2, $3, $4, 'admin', NOW(), NOW()) RETURNING id, email, name, credits, role",
      [email, name, hashed, 1000]
    );

    return NextResponse.json({ success: true, admin: res.rows[0] });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to seed admin' }, { status: 500 });
  }
}
