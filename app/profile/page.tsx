'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, getFirestore, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase'; // your initialized Firebase app

type UserDoc = {
  username?: string;
  email?: string;
  createdAt?: Timestamp | number | string;
  photoURL?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [fbUser, setFbUser] = useState<User | null>(null);
  const [data, setData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // auth state -> fetch Firestore doc
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login'); // or '/signin'
        return;
      }
      setFbUser(user);
      const snap = await getDoc(doc(db, 'users', user.uid));
      setData((snap.exists() ? (snap.data() as UserDoc) : null));
      setLoading(false);
    });
    return () => unsub();
  }, [auth, db, router]);

  const memberSince = (() => {
    const v = data?.createdAt;
    if (!v) return '';
    // handle Firestore Timestamp | ms number | ISO string
    const d =
      v instanceof Timestamp
        ? v.toDate()
        : typeof v === 'number'
        ? new Date(v)
        : new Date(v);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  })();

  const displayName = data?.username || fbUser?.displayName || 'User';

  const avatarSrc =
    (data?.photoURL && data.photoURL.length > 0 ? data.photoURL : null) ||
    (fbUser?.photoURL ?? '/default_user.jpg');

  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-10">
      <h1 className="text-3xl sm:text-4xl font-bold">Your profile</h1>

      <section className="mt-6 w-full max-w-2xl rounded-2xl p-6 shadow-lg bg-white/5 backdrop-blur-md border border-white/10">
        {loading ? (
          <div className="animate-pulse flex items-center gap-5">
            <div className="w-32 h-32 rounded-2xl bg-white/10" />
            <div className="flex-1">
              <div className="h-6 w-52 rounded bg-white/10 mb-3" />
              <div className="h-4 w-40 rounded bg-white/10" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {/* Left: square avatar */}
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white/10 border border-white/10">
              <Image
                src={avatarSrc}
                alt="Profile picture"
                width={128}
                height={128}
                className="h-full w-full object-cover"
                priority
              />
            </div>

            {/* Right: name + member since */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold leading-tight">
                {displayName}
              </h2>
              {memberSince && (
                <p className="text-sm opacity-80 mt-1">
                  Member since {memberSince}
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
