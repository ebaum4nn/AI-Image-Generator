import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        SUM(CASE WHEN st.user_id IS NULL THEN 1 ELSE 0 END) AS free,
        SUM(CASE WHEN st.user_id IS NOT NULL THEN 1 ELSE 0 END) AS paid
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT user_id FROM sales_transactions
      ) st ON st.user_id = u.id;
    `);

    const row = result.rows[0] || { free: 0, paid: 0 };
    return NextResponse.json({ 
      free: parseInt(row.free as any) || 0, 
      paid: parseInt(row.paid as any) || 0 
    });
  } catch (error) {
    console.error('Error fetching free vs paid users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch free vs paid users' },
      { status: 500 }
    );
  }
}
