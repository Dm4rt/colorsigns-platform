// lib/auth.ts
import { app } from './firebase';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';

const auth = getAuth(app);
const db = getFirestore(app);

export async function signUpUser(username: string, email: string, password: string) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    await setDoc(doc(db, 'users', user.uid), {
      username,
      email,
      createdAt: serverTimestamp(),
      photoURL: null,
    });

    return { success: true, error: null };
  } catch (e) {
    const err = e as AuthError;
    let message = 'An unknown error occurred. Please try again.';
    if (err.code === 'auth/email-already-in-use') message = 'This email address is already in use.';
    else if (err.code === 'auth/weak-password') message = 'The password must be at least 6 characters long.';
    else if (err.code === 'auth/invalid-email') message = 'Please enter a valid email address.';
    return { success: false, error: message };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true, error: null };
  } catch (e) {
    const err = e as AuthError;
    let message = 'Login failed. Please try again.';
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password')
      message = 'Invalid credentials. Check email and password.';
    else if (err.code === 'auth/user-not-found')
      message = 'No account found with that email.';
    else if (err.code === 'auth/too-many-requests')
      message = 'Too many attempts. Try again later.';
    return { success: false, error: message };
  }
}


export async function signOutUser() {
  await signOut(auth);
}

export async function getUserDoc(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as { username?: string; photoURL?: string | null; createdAt?: Timestamp | number | string }) : null;
}
