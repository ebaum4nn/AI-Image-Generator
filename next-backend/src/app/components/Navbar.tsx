export function Navbar() {
  return (
    <nav className="fixed top-0 w-full bg-gray-800 text-white p-4 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <a href="/" className="text-xl font-bold hover:text-gray-300">
            Admin Panel
          </a>
          <div className="flex space-x-4">
            <a href="/admin" className="hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              Dashboard
            </a>
            <a href="/admin/users" className="hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              Users
            </a>
            <a href="/admin/promos" className="hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              Promos
            </a>
            <a href="/admin/analytics" className="hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              Analytics
            </a>
            <a href="/admin/watermarks" className="hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              Watermarks
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
