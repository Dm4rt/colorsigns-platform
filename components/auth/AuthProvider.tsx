'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

type UserDoc = {
  username?: string;
  photoURL?: string | null;
  createdAt?: Timestamp | number | string;
};

type AuthCtx = {
  user: User | null;
  userDoc: UserDoc | null;
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
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        setUserDoc(null);
      } else {
        // live updates to /users/{uid}
        const unsubDoc = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null);
        });
        return () => unsubDoc();
      }
    });
    return () => unsubAuth();
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
