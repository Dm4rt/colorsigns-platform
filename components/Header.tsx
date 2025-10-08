'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function Header() {
  const { user, userDoc, loading, signOutUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOutUser();
    router.push('/');
  };

  return (
    <header className="bg-[#b68460] shadow-md">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white">
          Color Signs
        </Link>

        <div className="space-x-4">
          <Link href="/" className="text-white hover:text-blue-200">Home</Link>
          <Link href="/services" className="text-white hover:text-blue-200">Services</Link>
          <Link href="/about" className="text-white hover:text-blue-200">About Us</Link>
          <Link href="/contact" className="text-white hover:text-blue-200">Contact Us</Link>

          {loading ? (
            <span className="inline-block w-16 h-4 bg-white/30 rounded animate-pulse align-middle" />
          ) : user ? (
            <>
              <Link href="/profile" className="text-white hover:text-blue-200">
                {userDoc?.username ?? 'Profile'}
              </Link>
              <button onClick={handleLogout} className="text-white hover:text-blue-200">
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" className="text-white hover:text-blue-200">Sign Up</Link>
              <Link href="/login" className="text-white hover:text-blue-200">Log In</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
