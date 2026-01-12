'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'

export function Navbar() {
  const { data: session, status } = useSession()

  if (!session) {
    return (
      <nav className="fixed top-0 w-full bg-gray-800 text-white px-4 py-2 z-50">
        <div className="w-full px-4 flex justify-between items-center">
          <a href="/" className="flex items-center" aria-label="Image Generator">
            <span className="text-xl font-bold text-white">Image Generator</span>
          </a>
          <div className="flex items-center space-x-4">
            <a href="/auth/signin" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium">
              Sign In
            </a>
            <a href="/auth/signup" className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium">
              Sign Up
            </a>
          </div>
        </div>
      </nav>
    );
  }
  return (
    <nav className="fixed top-0 w-full bg-gray-800 text-white px-4 py-2 z-50">
      <div className="w-full px-4 flex justify-between items-center">
        <a href="/" className="flex items-center" aria-label="Image Generator">
          <span className="text-xl font-bold text-white">Image Generator</span>
        </a>
        <div className="flex items-center space-x-4">
          {/* Primary nav links */}
          <a href="/profile" className="hover:text-gray-300">Profile</a>
          <a href="/credits" className="border border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-md text-sm font-medium">
            Buy Credits
          </a>
          {(session.user && (session.user as any).role === 'admin') && (
            <a href="http://localhost:3001/admin" className="px-3 py-1 rounded-md text-sm font-medium">
              Admin
            </a>
          )}
          {/* User info and auth controls */}
          <span className="text-sm font-medium">
            Hello, {session.user?.name || session.user?.email}!
          </span>
          <div className="bg-gray-700 px-3 py-1 rounded-md text-sm font-medium">
            Credits: {session.user?.credits || 0}
          </div>
          <button
            onClick={() => signOut()}
            className="border text-white px-3 py-1 rounded-md text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
