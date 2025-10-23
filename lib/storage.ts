// lib/storage.ts
import { app } from '@/lib/firebase';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';

export async function uploadOrderImage(orderId: string, file: File, uid: string) {
  const storage = getStorage(app);
  const db = getFirestore(app);

  const path = `orders/${orderId}/images/${crypto.randomUUID()}-${file.name}`;
  const storageRef = ref(storage, path);

  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000, immutable',
  });

  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', undefined, reject, () => resolve());
  });

  const url = await getDownloadURL(storageRef);

  await addDoc(collection(db, 'orders', orderId, 'files'), {
    name: file.name,
    path,
    contentType: file.type,
    size: file.size,
    url,
    uploadedByUid: uid,
    createdAt: serverTimestamp(),
  });

  return { url, path };
}

export async function deleteOrderImage(orderId: string, fileDocId: string, path: string) {
  const storage = getStorage(app);
  const db = getFirestore(app);
  await deleteObject(ref(storage, path));
  await deleteDoc(doc(db, 'orders', orderId, 'files', fileDocId));
}
