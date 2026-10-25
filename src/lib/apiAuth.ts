import "server-only";

import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export type ApiUser = {
  uid: string;
  email: string | null;
  roles: string[];
};

export async function getFirebaseApiUser(
  request: NextRequest
): Promise<ApiUser | null> {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  const idToken = match[1].trim();

  if (!idToken) {
    return null;
  }

  try {
    // Verify the Firebase ID token and check whether it was revoked.
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    // Load the authoritative user record from Firestore.
    const userDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    // Reject accounts without an associated user document.
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();

    if (!userData || userData.isActive === false) {
      return null;
    }

    // Fail closed if roles are missing or malformed.
    if (
      !Array.isArray(userData.roles) ||
      !userData.roles.every(
        (role: unknown) => typeof role === "string"
      )
    ) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      roles: userData.roles,
    };
  } catch {
    // Invalid, expired, revoked, or otherwise unverifiable tokens
    // must not grant access.
    return null;
  }
}