'use client';

import React from 'react';

export function LineChart({ data }: { data: { month: string; new_users: number }[] }) {
  const width = 320;
  const height = 140;
  const padding = 24;
  const maxVal = Math.max(1, ...data.map(d => d.new_users));
  const stepX = (width - padding * 2) / Math.max(1, data.length - 1);
  const scaleY = (val: number) => height - padding - (val / maxVal) * (height - padding * 2);

  const points = data.map((d, i) => ({ x: padding + i * stepX, y: scaleY(d.new_users) }));
  const path = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      <rect x={0} y={0} width={width} height={height} fill="none" />
      {/* Axis */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />
      {/* Path */}
      <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#2563eb" />
      ))}
    </svg>
  );
}

export function PieChart({ free, paid }: { free: number; paid: number }) {
  const size = 160;
  const radius = 60;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, free + paid);
  const paidFrac = paid / total;
  const paidLen = paidFrac * circumference;
  const restLen = circumference - paidLen;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={16} />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth={16}
          strokeDasharray={`${paidLen} ${restLen}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-green-500" /> Paid: {paid} ({Math.round(paidFrac * 100)}%)</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-gray-300" /> Free: {free} ({Math.round((1 - paidFrac) * 100)}%)</div>
      </div>
    </div>
  );
}
