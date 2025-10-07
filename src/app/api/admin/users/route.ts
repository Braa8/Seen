import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function ensureAdminApp() {
  if (!getApps().length) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error("Firebase Admin SDK environment variables are missing!");
    }
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
}

function isAdmin(session: Session | null) {
  const roles = session?.user?.roles;
  return Array.isArray(roles) && roles.includes("admin");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    ensureAdminApp();
    const db = getFirestore();
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data() as { email?: string; roles?: string[]; name?: string | null };
      return {
        id: doc.id,
        email: data.email ?? "",
        name: data.name ?? null,
        roles: Array.isArray(data.roles) ? data.roles : ["viewer"],
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch users via admin API", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { userId?: string; roles?: string[] };
    if (!body.userId || !Array.isArray(body.roles)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    ensureAdminApp();
    const db = getFirestore();
    await db.collection("users").doc(body.userId).update({ roles: body.roles });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update user roles via admin API", error);
    return NextResponse.json({ error: "Failed to update user roles" }, { status: 500 });
  }
}
