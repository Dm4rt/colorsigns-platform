'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRef, useState } from 'react';

export default function Header() {
  const { user, userDoc, loading, signOutUser } = useAuth();
  const router = useRouter();
  const isAdmin = userDoc?.role === 'admin';

  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenuOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // small delay so you can move into the menu without it snapping shut
    closeTimer.current = setTimeout(() => setMenuOpen(false), 180);
  };

  const handleLogout = async () => {
    await signOutUser();
    router.push('/');
  };

  return (
    <header className="bg-[#b68460] shadow-md">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Color Signs Logo"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="text-2xl font-bold text-white hidden sm:inline">
            Color Signs
          </span>
          {isAdmin && (
            <span className="ml-2 rounded-full bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 px-2 py-0.5 text-xs font-semibold">
              Admin
            </span>
          )}
        </Link>

        <div className="space-x-4 flex items-center">
          <Link href="/" className="text-white hover:text-blue-200">
            Home
          </Link>
          <Link href="/services" className="text-white hover:text-blue-200">
            Services
          </Link>
          <Link href="/about" className="text-white hover:text-blue-200">
            About Us
          </Link>
          <Link href="/contact" className="text-white hover:text-blue-200">
            Contact Us
          </Link>

          {loading ? (
            <span className="inline-block w-16 h-4 bg-white/30 rounded animate-pulse align-middle" />
          ) : user ? (
            // ===== Username + Dropdown =====
            <div
              className="relative"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
            >
              <button
                type="button"
                className="text-white hover:text-blue-200 font-medium flex items-center gap-1"
                // Tap/click toggles on mobile
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {userDoc?.username ?? 'Profile'}
                <svg
                  className={`w-4 h-4 transition-transform ${
                    menuOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-md border border-white/20 bg-[#b68460]/95 backdrop-blur shadow-lg z-50 overflow-hidden"
                  // keep open while hovering the panel
                  onMouseEnter={openMenu}
                  onMouseLeave={scheduleClose}
                  role="menu"
                >
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-white hover:bg-white/20"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-white hover:bg-white/20"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/20"
                    role="menuitem"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/signup" className="text-white hover:text-blue-200">
                Sign Up
              </Link>
              <Link href="/login" className="text-white hover:text-blue-200">
                Log In
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
