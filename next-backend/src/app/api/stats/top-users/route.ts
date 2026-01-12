import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'flux_app',
  user: process.env.DB_USER || 'flux_user',
  password: process.env.DB_PASSWORD || 'flux_password',
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        u.name,
        u.email,
        COUNT(ig.id) as generation_count
      FROM users u
      LEFT JOIN image_generations ig ON u.id = ig.user_id
      WHERE ig.trashed = FALSE OR ig.trashed IS NULL
      GROUP BY u.id, u.name, u.email
      ORDER BY generation_count DESC
      LIMIT 5
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching top users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top users' },
      { status: 500 }
    );
  }
}