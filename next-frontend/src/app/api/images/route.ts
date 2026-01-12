import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { query } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await query(
      'SELECT id, prompt, image_url, width, height, steps, guidance, credits_used, created_at FROM image_generations WHERE user_id = $1 AND (trashed IS NOT TRUE) ORDER BY created_at DESC',
      [session.user.id]
    );

    const images = result.rows.map((img: any) => ({
      id: img.id,
      prompt: img.prompt,
      imageUrl: img.image_url,
      width: img.width,
      height: img.height,
      steps: img.steps,
      guidance: typeof img.guidance === 'number' ? img.guidance : parseFloat(img.guidance),
      creditsUsed: img.credits_used,
      timestamp: img.created_at,
    }));

    return NextResponse.json({ success: true, images });

  } catch (error) {
    console.error('Images API GET error:', error);
    return NextResponse.json({ success: true, images: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { prompt, image_url, width, height, steps, guidance, credits_used } = await request.json();

    if (!prompt || !image_url) {
      return NextResponse.json(
        { success: false, error: 'Prompt and image_url are required' },
        { status: 400 }
      );
    }

    const insert = await query(
      'INSERT INTO image_generations (user_id, prompt, image_url, width, height, steps, guidance, credits_used) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [
        session.user.id,
        prompt,
        image_url,
        width ?? null,
        height ?? null,
        steps ?? null,
        guidance ?? null,
        credits_used || 1,
      ]
    );

    return NextResponse.json({ success: true, image: { id: insert.rows[0].id } });

  } catch (error) {
    console.error('Images API POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}