import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

function isAdmin(roles: string[]) { return roles.includes("admin"); }

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.roles ?? [])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const snap = await adminDb.collection("users").get();
  const users = snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, email: data.email, displayName: data.displayName, roles: data.roles ?? ["viewer"], isActive: data.isActive ?? true, createdAt: data.createdAt };
  });

  return NextResponse.json({ users });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.roles ?? [])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { userId, roles } = await request.json() as { userId: string; roles: string[] };
  if (!userId || !Array.isArray(roles)) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "لا يمكن تعديل دورك الخاص" }, { status: 403 });
  }

  await adminDb.collection("users").doc(userId).update({ roles });
  return NextResponse.json({ success: true });
}
