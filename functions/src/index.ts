/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

initializeApp();

/** Ensure the caller is authenticated and an admin. */
async function assertAdmin(req: CallableRequest): Promise<void> {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const snap = await getFirestore().doc(`users/${uid}`).get();
  if (snap.get("role") !== "admin") {
    throw new HttpsError("permission-denied", "Admin only.");
  }
}

/** Permanently deletes an Auth user and their profile doc. Admin only. */
export const adminDeleteUser = onCall(async (req) => {
  await assertAdmin(req);

  const targetUid = (req.data?.uid as string) || "";
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "uid required");
  }

  await getAuth().deleteUser(targetUid);
  await getFirestore().doc(`users/${targetUid}`).delete().catch(() => null);

  return {ok: true};
});

/** Disables or enables an Auth user account. Admin only. */
export const adminSetDisabled = onCall(async (req) => {
  await assertAdmin(req);

  const uid = req.data?.uid as string;
  const disabled = req.data?.disabled as boolean;

  if (!uid || typeof disabled !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      "uid and disabled required"
    );
  }

  await getAuth().updateUser(uid, {disabled});
  return {ok: true};
});

/** Creates an Auth user and profile doc. Admin only. */
export const adminCreateUser = onCall(async (req) => {
  await assertAdmin(req);

  const email = (req.data?.email as string) || "";
  const password = (req.data?.password as string) || "";
  const username = (req.data?.username as string) || null;
  const role = (req.data?.role as string) || "user";

  if (!email || !password) {
    throw new HttpsError(
      "invalid-argument",
      "email and password required"
    );
  }

  // Create Auth user
  const created = await getAuth().createUser({
    email,
    password,
    displayName: username ?? undefined,
  });

  // Create Firestore profile
  const userDoc = {
    email,
    username,
    photoURL: null,
    role,
    createdAt: FieldValue.serverTimestamp(),
  };

  await getFirestore().doc(`users/${created.uid}`).set(userDoc);

  return {ok: true, uid: created.uid};
});
