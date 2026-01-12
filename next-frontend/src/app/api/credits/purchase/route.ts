import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { stripe } from '@/lib/stripe';

const packages = {
  starter: { credits: 50, price: 499 },
  popular: { credits: 150, price: 1299 },
  pro: { credits: 500, price: 3499 },
  unlimited: { credits: 2000, price: 9999 },
};

// Use backend validation endpoint rather than direct DB access
const backendBase = process.env.BACKEND_URL || 'http://backend-nextjs:3000';

async function getOrCreateCustomer(email: string) {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data && existing.data.length > 0) return existing.data[0];
  return await stripe.customers.create({ email });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    // Reject raw card data fields if client erroneously sends them
    const s = JSON.stringify(body).toLowerCase();
    if ([ 'card_number','number','card','cvc','cvv','exp_month','exp_year','expiry','pan' ].some(k => s.includes(k))) {
      return NextResponse.json({ error: 'Do not send card data to the server.' }, { status: 400 });
    }
    const { packageId, promoCode } = body;
    const selectedPackage = packages[packageId as keyof typeof packages];
    if (!selectedPackage) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const customer = await getOrCreateCustomer(String(session.user.email));

    // Get a saved payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
      limit: 1,
    });

    if (paymentMethods.data.length === 0) {
      return NextResponse.json({ error: 'NO_BILLING' }, { status: 400 });
    }

    const paymentMethodId = paymentMethods.data[0].id;

    // Apply promo code adjustments
    const normalizedCode = typeof promoCode === 'string' ? promoCode.trim().toUpperCase() : '';
    let discountedAmount = selectedPackage.price;
    let effectiveCredits = selectedPackage.credits;
    if (normalizedCode) {
      try {
        const res = await fetch(`${backendBase}/api/promos/validate?code=${encodeURIComponent(normalizedCode)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.valid) {
          return NextResponse.json({ error: 'INVALID_PROMO' }, { status: 400 });
        }
        if (data.type === 'percent' && typeof data.percent === 'number') {
          discountedAmount = Math.max(50, Math.round(selectedPackage.price * (1 - (data.percent / 100))));
        } else if (data.type === 'bonus' && typeof data.bonusCredits === 'number') {
          effectiveCredits = selectedPackage.credits + data.bonusCredits;
        }
      } catch (_) {
        return NextResponse.json({ error: 'INVALID_PROMO' }, { status: 400 });
      }
    }

    // Create and confirm an off-session payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: discountedAmount,
      currency: 'usd',
      customer: customer.id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        userId: String(session.user.id),
        packageId,
        credits: String(effectiveCredits),
        promoCode: normalizedCode || 'NONE',
        originalAmount: String(selectedPackage.price),
        discountedAmount: String(discountedAmount),
      },
    });

    // If requires_action, tell client to prompt for billing update
    if (paymentIntent.status === 'requires_action') {
      return NextResponse.json({ error: 'REQUIRES_ACTION' }, { status: 400 });
    }

    return NextResponse.json({ success: true, effectiveCredits });
  } catch (error: any) {
    if (error.code === 'payment_intent_authentication_failure') {
      return NextResponse.json({ error: 'REQUIRES_ACTION' }, { status: 400 });
    }
    console.error('Credits purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
