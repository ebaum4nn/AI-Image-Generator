'use client';

import { useState, useEffect } from 'react';
import { LineChart, PieChart } from './components/Charts';

interface TopUser {
  name: string;
  email: string;
  generation_count: number;
}

interface SalesStats {
  today: { total_sales: number; total_amount: number };
  month: { total_sales: number; total_amount: number };
  year: { total_sales: number; total_amount: number };
}

interface MonthlyUsers { month: string; new_users: number }
interface FreePaid { free: number; paid: number }

export default function Home() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [monthlyUsers, setMonthlyUsers] = useState<MonthlyUsers[]>([]);
  const [freePaid, setFreePaid] = useState<FreePaid | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [freePaidLoading, setFreePaidLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/top-users')
      .then(res => res.json())
      .then(data => {
        setTopUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching top users:', err);
        setTopUsers([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/stats/sales')
      .then(res => res.json())
      .then(data => {
        setSalesStats(data);
        setSalesLoading(false);
      })
      .catch(err => {
        console.error('Error fetching sales stats:', err);
        setSalesLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/stats/users/monthly')
      .then(res => res.json())
      .then(data => {
        setMonthlyUsers(Array.isArray(data) ? data : []);
        setUsersLoading(false);
      })
      .catch(err => {
        console.error('Error fetching monthly users:', err);
        setMonthlyUsers([]);
        setUsersLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/stats/users/free-paid')
      .then(res => res.json())
      .then(data => {
        setFreePaid(data && typeof data === 'object' ? data : { free: 0, paid: 0 });
        setFreePaidLoading(false);
      })
      .catch(err => {
        console.error('Error fetching free vs paid users:', err);
        setFreePaid({ free: 0, paid: 0 });
        setFreePaidLoading(false);
      });
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const cumulativeData: MonthlyUsers[] = monthlyUsers.reduce((acc: MonthlyUsers[], curr, idx) => {
    const prev = acc[idx - 1]?.new_users || 0;
    acc.push({ month: curr.month, new_users: prev + curr.new_users });
    return acc;
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">User Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Manage user accounts, roles, and permissions</p>
          <a href="/admin/users" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-block">
            Manage Users
          </a>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Promo Codes</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Create and manage promotional discount codes</p>
          <a href="/admin/promos" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-block">
            Manage Promos
          </a>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">View top users, sales, and user charts</p>
          <a href="/admin/analytics" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md inline-block">
            View Analytics
          </a>
        </div>
      </div>
    </div>
  );
}
