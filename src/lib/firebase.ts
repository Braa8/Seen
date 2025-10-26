// src/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore
} from "firebase/firestore";
import { Auth, getAuth } from "firebase/auth";
import { FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("تم تهيئة Firebase بنجاح");
  } else {
    app = getApps()[0];
  }

  // Initialize Firestore
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log("تم تهيئة Firestore بنجاح");

  // Initialize other Firebase services
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.error("حدث خطأ أثناء تهيئة Firebase:", error);
  throw error;
}

export { app, db, auth, storage };
export default app;