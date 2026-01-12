import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const res = await pool.query('SELECT id, code, type, percent, bonus_credits, active, starts_at, ends_at, max_redemptions, times_redeemed, created_at, updated_at FROM promo_codes ORDER BY created_at DESC');
    return NextResponse.json({ success: true, promos: res.rows });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to fetch promos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, type, percent, bonusCredits, active, startsAt, endsAt, maxRedemptions } = body;
    if (!code || !type || !['percent', 'bonus'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid promo payload' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO promo_codes (code, type, percent, bonus_credits, active, starts_at, ends_at, max_redemptions, created_at, updated_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6, $7, $8, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE SET type = EXCLUDED.type, percent = EXCLUDED.percent, bonus_credits = EXCLUDED.bonus_credits, active = COALESCE(EXCLUDED.active, promo_codes.active), starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, max_redemptions = EXCLUDED.max_redemptions, updated_at = NOW()
       RETURNING id, code, type, percent, bonus_credits, active, starts_at, ends_at, max_redemptions, times_redeemed, created_at, updated_at`,
      [code.trim().toUpperCase(), type, percent ?? null, bonusCredits ?? null, active, startsAt ?? null, endsAt ?? null, maxRedemptions ?? null]
    );

    return NextResponse.json({ success: true, promo: res.rows[0] });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to upsert promo' }, { status: 500 });
  }
}
