import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { initializeFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
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

// تهيئة Firestore مع إعدادات محسنة
const initializeFirebaseServices = () => {
  // تهيئة Firestore
  const firestore = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true
  });

  // تهيئة Authentication
  const authService = getAuth(app);
  
  // تهيئة Storage
  const storageService = getStorage(app);

  // في بيئة التطوير المحلي، يمكنك تفعيل المحاكي
  if (process.env.NODE_ENV === 'development') {
    try {
      // تأكد من تعطيل المحاكي إذا كان قيد التشغيل بالفعل
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      connectAuthEmulator(authService, 'http://localhost:9099');
      connectStorageEmulator(storageService, 'localhost', 9199);
      console.log('Firebase Emulators connected');
    } catch (error) {
      console.log('Not using Firebase Emulators', error);
    }
  }

  return { firestore, authService, storageService };
};

const { firestore, authService, storageService } = initializeFirebaseServices();

export const db = firestore;
export const auth = authService;
export const storage = storageService;
export default app;
