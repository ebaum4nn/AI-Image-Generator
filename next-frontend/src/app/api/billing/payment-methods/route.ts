import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe } from '@/lib/stripe'

async function getOrCreateCustomer(email: string) {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data && existing.data.length > 0) return existing.data[0]
  return await stripe.customers.create({ email })
}

export async function GET(_req: NextRequest) {
  console.log('Payment methods GET API called');
  try {
    const session = await getServerSession(authOptions)
    console.log('Session:', !!session, 'Email:', session?.user?.email);
    if (!session?.user?.email) {
      console.log('No session or email, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await getOrCreateCustomer(String(session.user.email))
    console.log('Customer found/created:', customer.id);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
      limit: 10,
    })
    console.log('Payment methods found:', paymentMethods.data.length);

    const defaultPmId = (customer.invoice_settings && (customer.invoice_settings as any).default_payment_method) || null
    console.log('Default payment method ID:', defaultPmId);

    const items = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand || 'card',
      last4: pm.card?.last4 || '',
      exp_month: pm.card?.exp_month || 0,
      exp_year: pm.card?.exp_year || 0,
      is_default: defaultPmId ? pm.id === defaultPmId : false,
    }))

    return NextResponse.json({ items, default_payment_method_id: defaultPmId })
  } catch (error) {
    console.error('Payment methods error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentMethodId } = await req.json()
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 })
    }

    const customer = await getOrCreateCustomer(String(session.user.email))
    
    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete payment method error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
