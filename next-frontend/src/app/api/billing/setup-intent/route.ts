import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { stripe } from '@/lib/stripe';

async function getOrCreateCustomer(email: string) {
  // Try to find existing customer by email
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data && existing.data.length > 0) {
    return existing.data[0];
  }
  // Create new customer
  return await stripe.customers.create({ email });
}

function containsCardData(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const s = JSON.stringify(obj).toLowerCase();
  return [
    'card_number', 'number', 'card', 'cvc', 'cvv', 'exp_month', 'exp_year', 'expiry', 'pan'
  ].some(k => s.includes(k));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Explicitly reject any attempt to send raw card data to the server
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => null);
        if (body && containsCardData(body)) {
          return NextResponse.json({ error: 'Do not send card data to the server.' }, { status: 400 });
        }
      }
    } catch (_) { /* ignore body parse errors */ }

    // Ensure Stripe customer exists and attach SetupIntent to it
    const customer = await getOrCreateCustomer(String(session.user.email));

    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        userId: String(session.user.id),
        email: String(session.user.email),
      },
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('SetupIntent creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
