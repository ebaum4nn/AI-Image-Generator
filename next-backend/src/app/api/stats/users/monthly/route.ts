import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - interval '11 months',
          date_trunc('month', NOW()),
          interval '1 month'
        ) AS month
      ), counts AS (
        SELECT date_trunc('month', created_at) AS month, COUNT(*) AS new_users
        FROM users
        GROUP BY 1
      )
      SELECT to_char(m.month, 'YYYY-MM') AS month, COALESCE(c.new_users, 0) AS new_users
      FROM months m
      LEFT JOIN counts c ON c.month = m.month
      ORDER BY m.month ASC;
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching monthly new users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly new users' },
      { status: 500 }
    );
  }
}
