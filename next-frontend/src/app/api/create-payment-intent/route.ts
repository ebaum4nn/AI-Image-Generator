import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { stripe } from '../../../lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Reject raw card data in request body
    const s = JSON.stringify(body).toLowerCase();
    if ([ 'card_number','number','card','cvc','cvv','exp_month','exp_year','expiry','pan' ].some(k => s.includes(k))) {
      return NextResponse.json({ error: 'Do not send card data to the server.' }, { status: 400 });
    }
    const { packageId } = body;

    // Define credit packages (should match frontend)
    const packages = {
      starter: { credits: 50, price: 499 }, // $4.99 in cents
      popular: { credits: 150, price: 1299 }, // $12.99 in cents
      pro: { credits: 500, price: 3499 }, // $34.99 in cents
      unlimited: { credits: 2000, price: 9999 }, // $99.99 in cents
    };

    const selectedPackage = packages[packageId as keyof typeof packages];
    if (!selectedPackage) {
      return NextResponse.json(
        { error: 'Invalid package' },
        { status: 400 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedPackage.price,
      currency: 'usd',
      metadata: {
        userId: session.user.id,
        packageId,
        credits: selectedPackage.credits.toString(),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: selectedPackage.price,
      credits: selectedPackage.credits,
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}