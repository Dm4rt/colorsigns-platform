'use client';

import Link from 'next/link';
import Image from 'next/image';
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
        {/* Logo Link */}
        <Link href="/" className="flex items-center">
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
