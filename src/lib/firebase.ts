import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const db = getFirestore(app);
export default app;
