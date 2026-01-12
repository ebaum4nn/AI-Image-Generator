import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS watermark_settings (
      id INTEGER PRIMARY KEY,
      visible_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      hidden_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      visible_text_template TEXT NOT NULL DEFAULT 'Image Generator • {email} • {timestamp}',
      hidden_key TEXT NOT NULL DEFAULT 'watermark',
      visible_position TEXT NOT NULL DEFAULT 'bottom-right',
      visible_opacity NUMERIC NOT NULL DEFAULT 0.15,
      visible_bar BOOLEAN NOT NULL DEFAULT TRUE,
      font_scale NUMERIC NOT NULL DEFAULT 0.03,
      visible_font_family TEXT,
      visible_font_data_url TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  // Add columns if they don't exist
  await pool.query(`ALTER TABLE watermark_settings ADD COLUMN IF NOT EXISTS visible_position TEXT NOT NULL DEFAULT 'bottom-right'`)
  await pool.query(`ALTER TABLE watermark_settings ADD COLUMN IF NOT EXISTS visible_opacity NUMERIC NOT NULL DEFAULT 0.15`)
  await pool.query(`ALTER TABLE watermark_settings ADD COLUMN IF NOT EXISTS visible_bar BOOLEAN NOT NULL DEFAULT TRUE`)
  await pool.query(`ALTER TABLE watermark_settings ADD COLUMN IF NOT EXISTS font_scale NUMERIC NOT NULL DEFAULT 0.03`)
  await pool.query(`ALTER TABLE watermark_settings ADD COLUMN IF NOT EXISTS visible_font_family TEXT`)
  await pool.query(`ALTER TABLE watermark_settings ADD COLUMN IF NOT EXISTS visible_font_data_url TEXT`)
}

export async function GET() {
  try {
    await ensureTable()
    const res = await pool.query('SELECT * FROM watermark_settings WHERE id = 1')
    if (res.rows.length === 0) {
      const defaults = {
        id: 1,
        visible_enabled: true,
        hidden_enabled: true,
        visible_text_template: 'Image Generator • {email} • {timestamp}',
        hidden_key: 'watermark',
        visible_position: 'bottom-right',
        visible_opacity: 0.15,
        visible_bar: true,
        font_scale: 0.03,
        visible_font_family: 'Inter, Arial, Helvetica, sans-serif',
        visible_font_data_url: null,
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(defaults)
    }
    return NextResponse.json(res.rows[0])
  } catch (err) {
    console.error('Watermarks GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch watermark settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureTable()
    const body = await request.json()
    const adminToken = request.headers.get('x-admin-token') || ''
    if (process.env.ADMIN_TOKEN && adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { visible_enabled, hidden_enabled, visible_text_template, hidden_key, visible_position, visible_opacity, visible_bar, font_scale, visible_font_family, visible_font_data_url } = body
    await pool.query(
      `INSERT INTO watermark_settings (id, visible_enabled, hidden_enabled, visible_text_template, hidden_key, updated_at)
       VALUES (1, $1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         visible_enabled = EXCLUDED.visible_enabled,
         hidden_enabled = EXCLUDED.hidden_enabled,
         visible_text_template = EXCLUDED.visible_text_template,
         hidden_key = EXCLUDED.hidden_key,
         updated_at = NOW()`,
      [
        Boolean(visible_enabled),
        Boolean(hidden_enabled),
        String(visible_text_template || 'Image Generator • {email} • {timestamp}'),
        String(hidden_key || 'watermark'),
      ]
    )
    // Update extended options separately to avoid conflict with earlier insert
    await pool.query(
      `UPDATE watermark_settings SET
        visible_position = $1,
        visible_opacity = $2,
        visible_bar = $3,
        font_scale = $4,
        visible_font_family = $5,
        visible_font_data_url = $6,
        updated_at = NOW()
      WHERE id = 1`,
      [
        String(visible_position || 'bottom-right'),
        Number(visible_opacity ?? 0.15),
        Boolean(visible_bar ?? true),
        Number(font_scale ?? 0.03),
        visible_font_family ? String(visible_font_family) : null,
        visible_font_data_url ? String(visible_font_data_url) : null,
      ]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Watermarks PUT error:', err)
    return NextResponse.json({ error: 'Failed to save watermark settings' }, { status: 500 })
  }
}
