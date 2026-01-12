'use client';

import SidebarNav from './SidebarNav';

export default function Footer() {
  return (
    <>
      {/* Desktop footer */}
      <div className="hidden lg:block border-t border-gray-200 dark:border-gray-700 py-2 px-4">
        <SidebarNav />
      </div>
      {/* Mobile footer */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-gray-800 text-white px-4 py-3 shadow-inner z-40">
        <div className="max-w-7xl mx-auto">
          <SidebarNav />
        </div>
      </div>
    </>
  );
}