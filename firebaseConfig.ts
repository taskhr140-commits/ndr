
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// إعدادات فايربيس
const firebaseConfig = {
  apiKey: "AIzaSyBxjEIOKQD1alKA7uhzOsNBeSQZYc4nAm0",
  authDomain: "naderhr.firebaseapp.com",
  projectId: "naderhr",
  storageBucket: "naderhr.firebasestorage.app",
  messagingSenderId: "999110919570",
  appId: "1:999110919570:web:615d9df8048e9c10146d4b"
};

// تهيئة التطبيق بشكل آمن يمنع توقف الموقع (White Screen)
let app;
let auth = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  // الموقع سيعمل ولكن بدون قاعدة بيانات حتى يتم إصلاح الخطأ
}

export { auth, db };
export default app;
