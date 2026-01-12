import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ valid: false, message: 'Enter a promo code' }, { status: 200 });
    }

    const res = await pool.query('SELECT code, type, percent, bonus_credits, active, starts_at, ends_at, max_redemptions, times_redeemed FROM promo_codes WHERE code = $1', [code]);
    if (res.rowCount === 0) {
      return NextResponse.json({ valid: false, message: 'Invalid or expired promo code' }, { status: 200 });
    }
    const p = res.rows[0];
    const now = new Date();
    const startsOk = !p.starts_at || new Date(p.starts_at) <= now;
    const endsOk = !p.ends_at || new Date(p.ends_at) >= now;
    const activeOk = !!p.active;
    const redemptionOk = !p.max_redemptions || (p.times_redeemed || 0) < p.max_redemptions;

    if (!startsOk || !endsOk || !activeOk || !redemptionOk) {
      return NextResponse.json({ valid: false, message: 'Invalid or expired promo code' }, { status: 200 });
    }

    if (p.type === 'percent' && p.percent) {
      return NextResponse.json({ valid: true, type: 'percent', percent: p.percent, message: `Applied: ${p.percent}% off` }, { status: 200 });
    }
    if (p.type === 'bonus' && p.bonus_credits) {
      return NextResponse.json({ valid: true, type: 'bonus', bonusCredits: p.bonus_credits, message: `Applied: +${p.bonus_credits} bonus credits` }, { status: 200 });
    }

    return NextResponse.json({ valid: false, message: 'Invalid promo configuration' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ valid: false, message: 'Error validating promo code' }, { status: 200 });
  }
}
