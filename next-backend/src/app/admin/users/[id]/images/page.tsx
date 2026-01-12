"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ImageRow {
  id: number;
  prompt: string;
  image_url: string;
  width: number | null;
  height: number | null;
  steps: number | null;
  guidance: number | null;
  credits_used: number | null;
  created_at: string;
  trashed: boolean | null;
}

export default function UserImagesPage() {
  const params = useParams();
  const userId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(24);
  const [total, setTotal] = useState(0);
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('all');
  const [userInfo, setUserInfo] = useState<{ id: number; email: string; name: string } | null>(null);
  const [lightboxImg, setLightboxImg] = useState<ImageRow | null>(null);
  const [wmLoading, setWmLoading] = useState(false);
  const [wmData, setWmData] = useState<{ found: boolean; key: string; value: string | null } | null>(null);
  const [wmOpen, setWmOpen] = useState(false);

  const FRONTEND_PUBLIC_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchImages = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          user_id: String(userId),
          limit: String(perPage),
          offset: String((page - 1) * perPage),
          include_deleted: String(showDeleted),
        });

        if (dateRange !== 'all') {
          const now = new Date();
          let start = new Date(now);
          if (dateRange === '7d') {
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          } else if (dateRange === '30d') {
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          }
          params.set('start_date', start.toISOString());
          params.set('end_date', now.toISOString());
        }

        const res = await fetch(`/api/admin/images?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch images');
        const data = await res.json();
        setImages(data.items || []);
        setTotal(data.total || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch images');
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, [userId, page, perPage, showDeleted, dateRange]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/users/${userId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUserInfo({ id: data.id, email: data.email, name: data.name });
        }
      } catch {}
    };
    fetchUser();
  }, [userId]);

  if (loading) return <div className="p-8">Loading images...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-8">
      <div className="mb-4">
        <a
          href="/admin/users"
          className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          <span>←</span>
          <span>Back to Users</span>
        </a>
      </div>
      <h1 className="text-2xl font-bold mb-4">
        {userInfo ? (
          <>User {userInfo.id} — {userInfo.name} ({userInfo.email}) — Generated Images</>
        ) : (
          <>User {userId} — Generated Images</>
        )}
      </h1>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }}
          />
          Show deleted
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <span>Per page</span>
          <select
            className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
            value={perPage}
            onChange={(e) => { setPerPage(parseInt(e.target.value, 10)); setPage(1); }}
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <span>Date range</span>
          <select
            className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value as 'all' | '7d' | '30d'); setPage(1); }}
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
        <span className="text-xs text-gray-400">
          Total: {total} • Visible: {images.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="px-3 py-1 text-sm rounded bg-gray-700 text-white disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="text-xs text-gray-400">Page {page} of {Math.max(1, Math.ceil(total / perPage))}</span>
          <button
            className="px-3 py-1 text-sm rounded bg-gray-700 text-white disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / perPage)}
          >
            Next
          </button>
        </div>
      </div>
      {images.length === 0 ? (
        <div className="text-gray-400">No images found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img) => (
            <div key={img.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${img.trashed ? 'opacity-75 ring-2 ring-red-500' : ''}`}>
              <div className="relative">
                <img
                  src={`${FRONTEND_PUBLIC_URL}${img.image_url}`}
                  alt={img.prompt}
                  className="w-full h-64 object-cover cursor-zoom-in"
                  onClick={() => setLightboxImg(img)}
                />
                {img.trashed && (
                  <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
                    Deleted
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-2">{new Date(img.created_at).toLocaleString()}</p>
                <p className="text-sm text-gray-900 dark:text-white mb-2 line-clamp-2">{img.prompt}</p>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {img.width && img.height ? `${img.width}x${img.height}` : ''}
                  {typeof img.steps === 'number' ? ` • steps: ${img.steps}` : ''}
                  {typeof img.guidance === 'number' ? ` • guidance: ${img.guidance}` : ''}
                  {typeof img.credits_used === 'number' ? ` • credits: ${img.credits_used}` : ''}
                  {img.trashed ? ' • status: deleted' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 overflow-y-auto" onClick={() => setLightboxImg(null)}>
          {/* Fixed close button stays visible even when content grows */}
          <button
            className="fixed top-4 right-4 bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700"
            onClick={() => setLightboxImg(null)}
          >
            Close
          </button>
          <div className="relative max-w-6xl w-full mx-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={`${FRONTEND_PUBLIC_URL}${lightboxImg.image_url}`}
              alt={lightboxImg.prompt}
              className="w-full max-h-[70vh] object-contain rounded"
            />
            <div className="mt-3 text-sm text-gray-200">
              <div className="font-semibold mb-1">{new Date(lightboxImg.created_at).toLocaleString()}</div>
              <div className="mb-1">{lightboxImg.prompt}</div>
              <div>
                {(lightboxImg.width && lightboxImg.height) ? `${lightboxImg.width}x${lightboxImg.height}` : ''}
                {typeof lightboxImg.steps === 'number' ? ` • steps: ${lightboxImg.steps}` : ''}
                {typeof lightboxImg.guidance === 'number' ? ` • guidance: ${lightboxImg.guidance}` : ''}
                {typeof lightboxImg.credits_used === 'number' ? ` • credits: ${lightboxImg.credits_used}` : ''}
                {lightboxImg.trashed ? ' • status: deleted' : ''}
              </div>
              <div className="mt-3">
                <button
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                  onClick={async () => {
                    if (wmOpen) {
                      setWmOpen(false);
                      return;
                    }
                    // If details not loaded yet, fetch them, then open
                    if (!wmData) {
                      setWmLoading(true);
                      try {
                        const res = await fetch(`/api/admin/images/watermark?image_id=${lightboxImg.id}`, { credentials: 'include' });
                        if (res.ok) {
                          const data = await res.json();
                          setWmData({ found: data.found, key: data.key, value: data.value });
                        }
                      } catch {}
                      setWmLoading(false);
                    }
                    setWmOpen(true);
                  }}
                >
                  {wmLoading ? 'Checking watermark…' : (wmOpen ? 'Hide watermark details' : 'Show watermark details')}
                </button>
                {wmData && wmOpen && (
                  <div className="mt-2 p-2 bg-gray-700 rounded text-xs max-h-48 overflow-y-auto border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div>Key: {wmData.key}</div>
                      <button className="text-gray-300 hover:text-white" onClick={() => setWmOpen(false)}>Close</button>
                    </div>
                    <div>Status: {wmData.found ? 'Found' : 'Not found'}</div>
                    {wmData.value && (
                      <pre className="mt-1 whitespace-pre-wrap break-words">{wmData.value}</pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
