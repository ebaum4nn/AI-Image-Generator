"use client";
import React, { useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  name: string;
  credits: number;
  credits_used_total?: number;
  role: string;
  created_at: string;
  updated_at: string;
  password?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<Partial<User>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', credits: 0, role: 'user' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<keyof User | 'credits_used_total' | null>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const fetchUsers = () => {
    setLoading(true);
    const params = new URLSearchParams({
      q: searchTerm.trim(),
      limit: String(perPage),
      offset: String((page - 1) * perPage),
      sort_key: String(sortKey || 'created_at'),
      sort_dir: sortDir,
    });
    fetch(`/api/users?${params.toString()}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      })
      .then((data) => { setUsers(data.items || []); setTotal(data.total || 0); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, sortKey, sortDir, page, perPage]);
  const handleSort = (key: keyof User | 'credits_used_total') => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = users; // server-side sorting

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditUser({ ...user, password: '' });
  };

  const handleSave = async (id: number) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editUser),
      });
      if (!res.ok) throw new Error('Failed to update user');
      fetchUsers();
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(users.filter(user => user.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      setError('Email, name, and password are required');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error('Failed to add user');
      fetchUsers();
      setShowAddForm(false);
      setNewUser({ email: '', name: '', password: '', credits: 0, role: 'user' });
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded bg-gray-900 text-white placeholder-gray-400"
          placeholder="Filter by name or email"
        />
        <span className="text-sm text-gray-300">
          Sort: {sortKey ? String(sortKey) : 'created_at'} ({sortDir})
        </span>
        <button
          onClick={() => { setSortKey(null); setSortDir('desc'); }}
          className="px-3 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          Reset sort
        </button>
        <label className="inline-flex items-center gap-2 text-sm text-gray-300 ml-auto">
          <span>Per page</span>
          <select
            className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
            value={perPage}
            onChange={(e) => { setPerPage(parseInt(e.target.value, 10)); setPage(1); }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 text-sm rounded bg-gray-700 text-white disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="text-xs text-gray-400">Page {page} of {Math.max(1, Math.ceil(total / perPage))} • Total {total}</span>
          <button
            className="px-3 py-1 text-sm rounded bg-gray-700 text-white disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / perPage)}
          >
            Next
          </button>
        </div>
      </div>
      <div className="mb-4">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showAddForm ? 'Cancel Add User' : 'Add New User'}
        </button>
      </div>
      {showAddForm && (
        <div className="mb-4 p-4 border rounded bg-black">
          <h2 className="text-lg font-semibold mb-2 text-white">Add New User</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-gray-900 text-white placeholder-gray-400"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-gray-900 text-white placeholder-gray-400"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-gray-900 text-white placeholder-gray-400"
                placeholder="Password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Credits</label>
              <input
                type="number"
                value={newUser.credits}
                onChange={(e) => setNewUser({ ...newUser, credits: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded bg-gray-900 text-white placeholder-gray-400"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-gray-900 text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAddUser}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add User
          </button>
        </div>
      )}
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-black text-white">
            <th className={`border px-2 py-1 cursor-pointer ${sortKey === 'id' ? 'bg-gray-800 ring-2 ring-blue-500' : ''}`} onClick={() => handleSort('id')}>
              ID {sortKey === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className={`border px-2 py-1 cursor-pointer ${sortKey === 'email' ? 'bg-gray-800 ring-2 ring-blue-500' : ''}`} onClick={() => handleSort('email')}>
              Email {sortKey === 'email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className={`border px-2 py-1 cursor-pointer ${sortKey === 'name' ? 'bg-gray-800 ring-2 ring-blue-500' : ''}`} onClick={() => handleSort('name')}>
              Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className={`border px-2 py-1 cursor-pointer ${sortKey === 'credits' ? 'bg-gray-800 ring-2 ring-blue-500' : ''}`} onClick={() => handleSort('credits')}>
              Credits {sortKey === 'credits' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className={`border px-2 py-1 cursor-pointer ${sortKey === 'credits_used_total' ? 'bg-gray-800 ring-2 ring-blue-500' : ''}`} onClick={() => handleSort('credits_used_total')}>
              Credits Used {sortKey === 'credits_used_total' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="border px-2 py-1">Images</th>
            <th className={`border px-2 py-1 cursor-pointer ${sortKey === 'role' ? 'bg-gray-800 ring-2 ring-blue-500' : ''}`} onClick={() => handleSort('role')}>
              Role {sortKey === 'role' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className={`border px-2 py-1 cursor-pointer ${sortKey === 'created_at' ? 'bg-gray-800 ring-2 ring-blue-500' : ''}`} onClick={() => handleSort('created_at')}>
              Created {sortKey === 'created_at' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className={`border px-2 py-1 cursor-pointer ${sortKey === 'updated_at' ? 'bg-gray-800 ring-2 ring-blue-500' : ''}`} onClick={() => handleSort('updated_at')}>
              Updated {sortKey === 'updated_at' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((user) => (
            <tr key={user.id}>
              <td className="border px-2 py-1">{user.id}</td>
              <td className="border px-2 py-1">
                {editingId === user.id ? (
                  <input
                    type="email"
                    value={editUser.email || ''}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                    className="w-40 px-1 py-1 border rounded"
                  />
                ) : (
                  user.email
                )}
              </td>
              <td className="border px-2 py-1">
                {editingId === user.id ? (
                  <input
                    type="text"
                    value={editUser.name || ''}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                    className="w-32 px-1 py-1 border rounded"
                  />
                ) : (
                  user.name
                )}
              </td>
              <td className="border px-2 py-1">
                {editingId === user.id ? (
                  <input
                    type="number"
                    value={editUser.credits ?? user.credits}
                    onChange={(e) => setEditUser({ ...editUser, credits: Number(e.target.value) })}
                    className="w-20 px-1 py-1 border rounded"
                  />
                ) : (
                  user.credits
                )}
              </td>
              <td className="border px-2 py-1">
                {user.credits_used_total ?? 0}
              </td>
              <td className="border px-2 py-1">
                <a
                  href={`/admin/users/${user.id}/images`}
                  className="px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600"
                >
                  View
                </a>
              </td>
              <td className="border px-2 py-1">
                {editingId === user.id ? (
                  <select
                    value={editUser.role || user.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    className="w-24 px-1 py-1 border rounded"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  user.role
                )}
              </td>
              <td className="border px-2 py-1">{new Date(user.created_at).toLocaleString()}</td>
              <td className="border px-2 py-1">{new Date(user.updated_at).toLocaleString()}</td>
              <td className="border px-2 py-1 space-x-2">
                {editingId === user.id ? (
                  <>
                    <div className="mb-2">
                      <label className="block text-xs text-gray-600">New Password (optional)</label>
                      <input
                        type="password"
                        value={editUser.password || ''}
                        onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                        className="w-40 px-2 py-1 border rounded"
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                    <button
                      onClick={() => handleSave(user.id)}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(user)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
