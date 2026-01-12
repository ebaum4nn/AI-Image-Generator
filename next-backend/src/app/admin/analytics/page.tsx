'use client';

import { useState, useEffect } from 'react';
import { LineChart, PieChart } from '../../components/Charts';

interface TopUser { name: string; email: string; generation_count: number }
interface SalesStats {
  today: { total_sales: number; total_amount: number };
  month: { total_sales: number; total_amount: number };
  year: { total_sales: number; total_amount: number };
}
interface MonthlyUsers { month: string; new_users: number }
interface FreePaid { free: number; paid: number }

export default function AnalyticsPage() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [monthlyUsers, setMonthlyUsers] = useState<MonthlyUsers[]>([]);
  const [freePaid, setFreePaid] = useState<FreePaid | null>(null);
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingFreePaid, setLoadingFreePaid] = useState(true);

  useEffect(() => {
    fetch('/api/stats/top-users')
      .then(r => r.json())
      .then(d => { setTopUsers(Array.isArray(d) ? d : []); setLoadingTop(false); })
      .catch(() => { setTopUsers([]); setLoadingTop(false); });
  }, []);

  useEffect(() => {
    fetch('/api/stats/sales')
      .then(r => r.json())
      .then(d => { setSalesStats(d); setLoadingSales(false); })
      .catch(() => { setLoadingSales(false); });
  }, []);

  useEffect(() => {
    fetch('/api/stats/users/monthly')
      .then(r => r.json())
      .then(d => { setMonthlyUsers(Array.isArray(d) ? d : []); setLoadingMonthly(false); })
      .catch(() => { setMonthlyUsers([]); setLoadingMonthly(false); });
  }, []);

  useEffect(() => {
    fetch('/api/stats/users/free-paid')
      .then(r => r.json())
      .then(d => { setFreePaid(d && typeof d === 'object' ? d : { free: 0, paid: 0 }); setLoadingFreePaid(false); })
      .catch(() => { setFreePaid({ free: 0, paid: 0 }); setLoadingFreePaid(false); });
  }, []);

  const formatCurrency = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  const cumulativeData: MonthlyUsers[] = monthlyUsers.reduce((acc: MonthlyUsers[], curr, idx) => {
    const prev = acc[idx - 1]?.new_users || 0;
    acc.push({ month: curr.month, new_users: prev + curr.new_users });
    return acc;
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      {/* Top row: Top Users and Sales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Top Users</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Most image generations</p>
          {loadingTop ? <div className="text-gray-500">Loading...</div> : (
            <div className="space-y-2">
              {topUsers.map((u) => (
                <div key={u.email} className="flex justify-between items-center text-sm">
                  <span className="truncate">{u.name || u.email}</span>
                  <span className="font-semibold text-blue-600">{u.generation_count}</span>
                </div>
              ))}
              {topUsers.length === 0 && <div className="text-gray-500 text-sm">No generations yet</div>}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Sales</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Revenue overview</p>
          {loadingSales ? <div className="text-gray-500">Loading...</div> : salesStats && salesStats.today && salesStats.month && salesStats.year ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Today</div>
                <div className="text-lg font-bold">{salesStats.today.total_sales || 0} sales</div>
                <div className="text-sm text-green-600">{formatCurrency(salesStats.today.total_amount || 0)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</div>
                <div className="text-lg font-bold">{salesStats.month.total_sales || 0} sales</div>
                <div className="text-sm text-green-600">{formatCurrency(salesStats.month.total_amount || 0)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">This Year</div>
                <div className="text-lg font-bold">{salesStats.year.total_sales || 0} sales</div>
                <div className="text-sm text-green-600">{formatCurrency(salesStats.year.total_amount || 0)}</div>
              </div>
            </div>
          ) : <div className="text-gray-500 text-sm">No sales data available</div>}
        </div>
      </div>

      {/* Second row: New Users and User Types side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">New Users</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Monthly vs all-time cumulative</p>
          {loadingMonthly ? <div className="text-gray-500">Loading...</div> : monthlyUsers.length > 0 ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Monthly</div>
                <LineChart data={monthlyUsers} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">All-Time Cumulative</div>
                <LineChart data={cumulativeData} />
              </div>
            </div>
          ) : <div className="text-gray-500 text-sm">No user data available</div>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">User Types</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Free vs Paid</p>
          {loadingFreePaid ? <div className="text-gray-500">Loading...</div> : freePaid ? (
            <PieChart free={freePaid.free} paid={freePaid.paid} />
          ) : <div className="text-gray-500 text-sm">No user type data available</div>}
        </div>
      </div>
    </div>
  );
}
