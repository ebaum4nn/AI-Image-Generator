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
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Sales today
    const todayResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(amount_cents), 0) as total_amount
      FROM sales_transactions 
      WHERE created_at >= $1
    `, [startOfToday]);

    // Sales this month
    const monthResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(amount_cents), 0) as total_amount
      FROM sales_transactions 
      WHERE created_at >= $1
    `, [startOfMonth]);

    // Sales this year
    const yearResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(amount_cents), 0) as total_amount
      FROM sales_transactions 
      WHERE created_at >= $1
    `, [startOfYear]);

    return NextResponse.json({
      today: {
        total_sales: parseInt(todayResult.rows[0].total_sales) || 0,
        total_amount: parseInt(todayResult.rows[0].total_amount) || 0
      },
      month: {
        total_sales: parseInt(monthResult.rows[0].total_sales) || 0,
        total_amount: parseInt(monthResult.rows[0].total_amount) || 0
      },
      year: {
        total_sales: parseInt(yearResult.rows[0].total_sales) || 0,
        total_amount: parseInt(yearResult.rows[0].total_amount) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales stats' },
      { status: 500 }
    );
  }
}