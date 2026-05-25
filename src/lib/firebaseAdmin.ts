import "server-only";
import admin from "firebase-admin";

function createAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY ?? "";

  // Handle different formats of private key
  privateKey = privateKey
    .replace(/^["']|["']$/g, "")   // remove surrounding quotes
    .replace(/\\n/g, "\n");         // convert \n to actual newlines

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

createAdminApp();

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminFieldValue = admin.firestore.FieldValue;
