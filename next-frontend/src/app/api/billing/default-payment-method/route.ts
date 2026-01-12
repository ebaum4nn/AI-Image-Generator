import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe } from '@/lib/stripe'

async function getOrCreateCustomer(email: string) {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data && existing.data.length > 0) return existing.data[0]
  return await stripe.customers.create({ email })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentMethodId } = await req.json()
    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 })
    }

    const customer = await getOrCreateCustomer(String(session.user.email))
    // Set default payment method for invoices/off-session charges
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Set default payment method error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
