'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

type UserDoc = {
  username?: string;
  photoURL?: string | null;
  createdAt?: Timestamp | number | string;
  role?: 'admin' | 'user';
};

type AuthCtx = {
  user: User | null;
  userDoc: UserDoc | null;
  // 'loading' now means: auth state + first userDoc snapshot are ready
  loading: boolean;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  userDoc: null,
  loading: true,
  signOutUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      // Clean up any prior userDoc listener when auth state changes
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      setUser(u);

      // If logged out: we can finish loading immediately
      if (!u) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      // If logged in: keep loading=true until FIRST userDoc snapshot arrives
      setLoading(true);
      const ref = doc(db, 'users', u.uid);
      unsubscribeUserDoc = onSnapshot(
        ref,
        (snap) => {
          setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null);
          setLoading(false);
        },
        () => {
          setUserDoc(null);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      unsubscribeAuth();
    };
  }, [auth, db]);

  const signOutUser = async () => {
    const { signOutUser: doSignOut } = await import('@/lib/auth');
    await doSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
