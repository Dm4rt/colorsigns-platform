import { getAuth, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebase'; // Corrected import path

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Creates a new user in Firebase Auth and a corresponding document in Firestore.
 * @param {string} username - The user's chosen username.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<{success: boolean, error: string | null}>} - An object indicating success or failure.
 */
 // Add types to the function parameters 👇
export async function signUpUser(username: string, email: string, password: string) {
  try {
    // Step 1: Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Step 2: If the user was created successfully, create their profile in Firestore.
    await setDoc(doc(db, 'users', user.uid), {
      username: username,
      email: email,
      createdAt: serverTimestamp(),
    });

    return { success: true, error: null };

  } catch (error) {
    // Step 3: Catch and handle errors
    const authError = error as AuthError; // Type assertion for better error handling
    let errorMessage = 'An unknown error occurred. Please try again.';
    
    if (authError.code === 'auth/email-already-in-use') {
      errorMessage = 'This email address is already in use.';
    } else if (authError.code === 'auth/weak-password') {
      errorMessage = 'The password must be at least 6 characters long.';
    } else if (authError.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
    }

    console.error("Firebase SignUp Error:", authError.message);
    return { success: false, error: errorMessage };
  }
}
