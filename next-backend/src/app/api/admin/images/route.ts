import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '24', 10), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)
    const includeDeleted = url.searchParams.get('include_deleted') === 'true'
    const startDate = url.searchParams.get('start_date') // ISO string
    const endDate = url.searchParams.get('end_date') // ISO string

    const conditions: string[] = ['user_id = $1']
    const params: any[] = [userId]
    let pIndex = 2

    if (!includeDeleted) {
      conditions.push(`COALESCE(trashed, false) = $${pIndex}`)
      params.push(false)
      pIndex++
    }

    if (startDate) {
      const sd = new Date(startDate)
      if (!isNaN(sd.getTime())) {
        conditions.push(`created_at >= $${pIndex}`)
        params.push(sd)
        pIndex++
      }
    }

    if (endDate) {
      const ed = new Date(endDate)
      if (!isNaN(ed.getTime())) {
        conditions.push(`created_at <= $${pIndex}`)
        params.push(ed)
        pIndex++
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) AS total FROM image_generations ${whereClause}`
    const countResult = await pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0]?.total || '0', 10)

    // Add limit/offset params to the end for the items query
    const itemsParams = params.slice()
    const limitIndex = pIndex
    const offsetIndex = pIndex + 1
    itemsParams.push(limit)
    itemsParams.push(offset)

    const itemsQuery = `
      SELECT id, prompt, image_url, width, height, steps, guidance, credits_used, created_at, trashed
      FROM image_generations
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `

    const itemsResult = await pool.query(itemsQuery, itemsParams)

    return NextResponse.json({ items: itemsResult.rows, total })
  } catch (err) {
    console.error('Admin images GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}
