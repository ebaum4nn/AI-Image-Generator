import { NextRequest, NextResponse } from 'next/server';

// Proxy to backend validation
const backendBase = process.env.BACKEND_URL || 'http://backend-nextjs:3000';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const res = await fetch(`${backendBase}/api/promos/validate?${url.searchParams.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ valid: false, message: 'Error contacting backend' }, { status: 200 });
  }
}
