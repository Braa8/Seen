import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const snap = await adminDb.collection("notifications")
    .where("userId", "==", session.user.id)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ notifications });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { id } = await request.json() as { id: string };
  if (!id) return NextResponse.json({ error: "معرف الإشعار مطلوب" }, { status: 400 });

  const ref = adminDb.collection("notifications").doc(id);
  const snap = await ref.get();

  if (!snap.exists || snap.data()?.userId !== session.user.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  await ref.update({ read: true, readAt: adminFieldValue.serverTimestamp() });
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const snap = await adminDb.collection("notifications")
    .where("userId", "==", session.user.id)
    .where("read", "==", true)
    .get();

  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return NextResponse.json({ success: true, deleted: snap.size });
}
