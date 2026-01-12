import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = headers().get('stripe-signature');

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    let event: any;

    try {
      event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const { userId, credits, packageId, promoCode, originalAmount, discountedAmount } = paymentIntent.metadata;

        if (userId && credits) {
          // Update user credits
          const userRes = await query('SELECT credits FROM users WHERE id = $1', [userId]);
          const user = userRes.rows[0];

          if (user) {
            const newCredits = user.credits + parseInt(credits);
            await query('UPDATE users SET credits = $1 WHERE id = $2', [newCredits, userId]);

            // Record sales transaction
            try {
              await query(`
                INSERT INTO sales_transactions 
                (user_id, stripe_payment_intent_id, package_id, credits_purchased, amount_cents, promo_code)
                VALUES ($1, $2, $3, $4, $5, $6)
              `, [
                userId,
                paymentIntent.id,
                packageId || 'unknown',
                parseInt(credits),
                parseInt(discountedAmount || originalAmount || paymentIntent.amount),
                promoCode && promoCode !== 'NONE' ? promoCode : null
              ]);
            } catch (salesError) {
              // Don't fail the webhook if sales recording fails
            }
          }
        }
        break;

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}