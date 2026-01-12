import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
const extractChunks = require('png-chunks-extract')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const textChunk = require('png-chunk-text')

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const imageId = url.searchParams.get('image_id')
    const imageUrlParam = url.searchParams.get('image_url')
    const key = url.searchParams.get('key') || 'watermark'

    let imageUrl = imageUrlParam || ''
    if (!imageUrl && imageId) {
      const res = await pool.query('SELECT image_url FROM image_generations WHERE id = $1', [imageId])
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }
      imageUrl = res.rows[0].image_url
    }
    if (!imageUrl) {
      return NextResponse.json({ error: 'image_url or image_id is required' }, { status: 400 })
    }

    // Prefer internal URL for server-side fetch within Docker network
    const internalBase = process.env.FRONTEND_INTERNAL_URL || process.env.FRONTEND_PUBLIC_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${internalBase}${imageUrl}`

    const resp = await fetch(fullUrl)
    if (!resp.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${resp.status}`, fetch_url: fullUrl }, { status: 502 })
    }
    const arrayBuf = await resp.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const chunks = extractChunks(buffer)
    const textChunks = chunks.filter((c: any) => c.name === 'tEXt')
    const decoded = textChunks.map((c: any) => {
      try {
        const d = textChunk.decode(c.data)
        return { key: d.keyword, text: d.text }
      } catch {
        return null
      }
    }).filter((x: any) => !!x)

    const match = decoded.find((d: any) => d.key === key) || null
    return NextResponse.json({
      image_url: imageUrl,
      full_url: fullUrl,
      key,
      found: !!match,
      value: match?.text || null,
      all_text_chunks: decoded,
    })
  } catch (err) {
    console.error('Admin watermark inspect error:', err)
    return NextResponse.json({ error: 'Failed to inspect watermark' }, { status: 500 })
  }
}
