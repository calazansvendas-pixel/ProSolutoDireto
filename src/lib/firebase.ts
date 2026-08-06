import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPZ8w4FbUC2TzZpDQAyEXlqBis32TA7oE",
  authDomain: "pro-soluto-direto.firebaseapp.com",
  projectId: "pro-soluto-direto",
  storageBucket: "pro-soluto-direto.firebasestorage.app",
  messagingSenderId: "976149647028",
  appId: "1:976149647028:web:5efd6a3a965b0350d8d1e1"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason?.message || event.reason || '');
    if (
      reason.includes('Database is closing') ||
      reason.includes('closing/hidden') ||
      reason.includes('IndexedDB') ||
      reason.includes('database connection is closing') ||
      reason.includes('InternalError')
    ) {
      event.preventDefault();
      console.warn('Handled background storage/database state event:', reason);
    }
  });

  window.addEventListener('error', (event) => {
    const message = String(event.message || '');
    if (
      message.includes('Database is closing') ||
      message.includes('closing/hidden') ||
      message.includes('IndexedDB')
    ) {
      event.preventDefault();
      console.warn('Handled global database error:', message);
    }
  });
}

export default app;

