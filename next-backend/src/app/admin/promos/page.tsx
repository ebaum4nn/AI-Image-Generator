"use client";
import { useEffect, useState } from 'react';

interface Promo {
  id: number;
  code: string;
  type: 'percent' | 'bonus';
  percent?: number | null;
  bonus_credits?: number | null;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_redemptions?: number | null;
  times_redeemed?: number | null;
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    code: '',
    type: 'percent' as 'percent' | 'bonus',
    percent: 10,
    bonusCredits: 20,
    active: true,
    startsAt: '',
    endsAt: '',
    maxRedemptions: '' as string | number,
  });

  const loadPromos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/promos');
      const data = await res.json();
      if (res.ok && data.success) {
        setPromos(data.promos || []);
      } else if (Array.isArray(data)) {
        setPromos(data);
      } else {
        setMessage(data.error || 'Failed to load promos');
      }
    } catch (e) {
      setMessage('Failed to load promos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPromos(); }, []);

  const upsertPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      active: form.active,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
    };
    if (form.type === 'percent') payload.percent = Number(form.percent);
    if (form.type === 'bonus') payload.bonusCredits = Number(form.bonusCredits);

    try {
      const res = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && (data.success || data.id)) {
        setMessage('Promo saved');
        setForm({ ...form, code: '' });
        await loadPromos();
      } else {
        setMessage(data.error || 'Failed to save promo');
      }
    } catch (e) {
      setMessage('Failed to save promo');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Manage Promo Codes</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Create / Update Promo</h2>
            <form onSubmit={upsertPromo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'percent' | 'bonus' })} className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="percent">Percent Discount</option>
                  <option value="bonus">Bonus Credits</option>
                </select>
              </div>
              {form.type === 'percent' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Percent</label>
                  <input type="number" min={1} max={90} value={form.percent} onChange={e => setForm({ ...form, percent: Number(e.target.value) })} className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bonus Credits</label>
                  <input type="number" min={1} max={1000} value={form.bonusCredits} onChange={e => setForm({ ...form, bonusCredits: Number(e.target.value) })} className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Starts At</label>
                  <input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ends At</label>
                  <input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                  <span className="text-gray-700 dark:text-gray-300">Active</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Redemptions</label>
                  <input type="number" min={1} value={form.maxRedemptions as number} onChange={e => setForm({ ...form, maxRedemptions: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {message && <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium">Save Promo</button>
            </form>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Existing Promos</h2>
            {loading ? (
              <p className="text-gray-700 dark:text-gray-300">Loading...</p>
            ) : promos.length === 0 ? (
              <p className="text-gray-700 dark:text-gray-300">No promos found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Value</th>
                      <th className="px-3 py-2 text-left">Active</th>
                      <th className="px-3 py-2 text-left">Window</th>
                      <th className="px-3 py-2 text-left">Redemptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map(p => (
                      <tr key={p.id} className="border-b bg-white dark:bg-gray-800">
                        <td className="px-3 py-2 font-mono">{p.code}</td>
                        <td className="px-3 py-2">{p.type}</td>
                        <td className="px-3 py-2">{p.type === 'percent' ? `${p.percent}%` : `+${p.bonus_credits} credits`}</td>
                        <td className="px-3 py-2">{p.active ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">{p.starts_at || '—'} → {p.ends_at || '—'}</td>
                        <td className="px-3 py-2">{(p.times_redeemed || 0)} / {p.max_redemptions || '∞'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
