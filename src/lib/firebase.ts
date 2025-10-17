import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// لتجنب إعادة التهيئة عند Hot Reload
const app: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// إضافة Firestore (تمكين auto long polling لمعالجة مشاكل الشبكة/الوكلاء)
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();
export const auth = getAuth(app);
export const storage = getStorage(app);

if (typeof window !== "undefined") {
  (window as typeof window & { __FIREBASE_APP__?: FirebaseApp }).__FIREBASE_APP__ = app;
  // TODO: Remove this log after confirming production environment configuration.
  console.log("[Debug] Firebase projectId:", app.options.projectId);
}

export default app;
