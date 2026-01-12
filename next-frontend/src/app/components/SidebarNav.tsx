'use client';

import React from 'react';

export default function SidebarNav() {
  return (
    <nav className="text-xs pb-2 flex flex-col">
      <ul className="flex flex-col items-center justify-center gap-2 flex-grow">
        <li>
          <span className="text-gray-500">© 2026 Image Generator</span>
        </li>
      </ul>
    </nav>
  );
}
