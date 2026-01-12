
'use client';
import { useSession, signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import SidebarNav from '../components/SidebarNav';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState(''); // current email
  const [newEmail, setNewEmail] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [billingReady, setBillingReady] = useState(false);

  // Fetch profile data from API on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setBirthdate(data.birthdate || '');
          setEmail(data.email || '');
          setNewEmail('');
          setImage(data.image || '');
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Prepare Stripe SetupIntent for billing on mount when session present
  useEffect(() => {
    const initBilling = async () => {
      if (!session || !stripePromise) return;
      try {
        const res = await fetch('/api/billing/setup-intent', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setSetupClientSecret(data.clientSecret || null);
          setBillingReady(true);
        }
      } catch (_) {
        // silently ignore
      }
    };
    initBilling();
  }, [session]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Profile</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-4">You must be signed in to view your profile.</p>
          <button onClick={() => signIn()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">Sign In</button>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          birthdate,
          email: newEmail || email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        await update();
        setNewEmail('');
      } else {
        setError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-gray-700 dark:text-gray-300">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full md:w-1/2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Profile</h1>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1" htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1" htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1" htmlFor="birthdate">Birthdate</label>
                <input
                  id="birthdate"
                  type="date"
                  className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={birthdate}
                  onChange={e => setBirthdate(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1" htmlFor="current-email">Current Email</label>
                <input
                  id="current-email"
                  type="email"
                  className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={email || ''}
                  placeholder="demo@example.com"
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1" htmlFor="new-email">New Email</label>
                <input
                  id="new-email"
                  type="email"
                  className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="New Email"
                  disabled={saving}
                />
              </div>
              {image && (
                <div className="mb-4 flex justify-center">
                  <img src={image} alt="Profile" className="rounded-full w-24 h-24 border-2 border-gray-300 dark:border-gray-700" />
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {success && <div className="text-green-600 text-center">Profile updated successfully!</div>}
              {error && <div className="text-red-600 text-center">{error}</div>}
            </form>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full md:w-1/2 flex flex-col justify-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Billing Info</h2>
            {!stripePromise || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
              <div className="text-red-600 dark:text-red-400">Please populate the stripe info</div>
            ) : !billingReady || !setupClientSecret ? (
              <div className="text-gray-700 dark:text-gray-300">Loading billing form...</div>
            ) : (
              <Elements
                stripe={stripePromise!}
                options={{
                  clientSecret: setupClientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#3B82F6', // tailwind blue-500
                      colorBackground: '#111827', // tailwind gray-900
                      colorText: '#F3F4F6', // tailwind gray-100
                      colorTextSecondary: '#9CA3AF', // tailwind gray-400
                      colorTextPlaceholder: '#6B7280', // tailwind gray-500
                      colorDanger: '#EF4444', // tailwind red-500
                      borderRadius: '6px',
                      spacingUnit: '4px',
                    },
                    rules: {
                      '.Input': {
                        backgroundColor: '#111827',
                        color: '#F3F4F6',
                        border: '1px solid #374151', // tailwind gray-700
                        padding: '10px 12px',
                      },
                      '.Label': {
                        color: '#9CA3AF',
                        fontWeight: '400',
                        fontSize: '14px',
                      },
                      '.Tab': {
                        backgroundColor: '#1F2937', // tailwind gray-800
                        color: '#F3F4F6',
                        border: '1px solid #374151',
                      },
                    },
                  },
                }}
              >
                <BillingForm defaultEmail={email} defaultName={[firstName, lastName].filter(Boolean).join(' ')} />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingForm({ defaultEmail, defaultName }: { defaultEmail: string; defaultName: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [addressComplete, setAddressComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              email: defaultEmail || undefined,
            },
          },
        },
        redirect: 'if_required',
      });

      if (result.error) {
        setMessage(result.error.message || 'Failed to save billing info');
      } else {
        setMessage('Billing info saved.');
        try {
          window?.localStorage?.setItem('billingReady', 'true');
        } catch (_) {
          // ignore
        }
      }
    } catch (err) {
      setMessage('Failed to save billing info');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name collected via Stripe AddressElement */}
      <div>
        <label className="block text-gray-500 dark:text-gray-400 mb-1">Billing Address</label>
        <AddressElement
          options={{
            mode: 'billing',
            allowedCountries: ['US', 'CA'],
            defaultValues: {
              name: defaultName || undefined,
            },
          }}
          onChange={(e) => setAddressComplete(e.complete)}
        />
      </div>
      <div>
        <label className="block text-gray-500 dark:text-gray-400 mb-1">Payment Method</label>
        <PaymentElement />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium disabled:opacity-50"
        disabled={submitting || !stripe || !elements || !addressComplete}
      >
        {submitting ? 'Saving...' : 'Save Billing Info'}
      </button>
      {message && <div className="text-center text-gray-700 dark:text-gray-300">{message}</div>}
    </form>
  );
}
