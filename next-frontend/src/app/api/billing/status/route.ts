import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { stripe } from '@/lib/stripe';

async function getOrCreateCustomer(email: string) {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data && existing.data.length > 0) return existing.data[0];
  return await stripe.customers.create({ email });
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await getOrCreateCustomer(String(session.user.email));
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
      limit: 1,
    });

    const hasPaymentMethod = paymentMethods.data.length > 0;
    return NextResponse.json({ ready: hasPaymentMethod });
  } catch (error) {
    console.error('Billing status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
