import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getFirebaseApiUser } from "@/lib/apiAuth";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";

async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  // Keep the website's existing NextAuth authentication.
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return session.user.id;
  }

  // Support Flutter through Firebase Authentication.
  const firebaseUser = await getFirebaseApiUser(request);

  if (firebaseUser) {
    return firebaseUser.uid;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }

    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/notifications:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الإشعارات" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صحيحة" },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "بيانات الطلب غير صحيحة" },
        { status: 400 }
      );
    }

    const id = (body as Record<string, unknown>).id;

    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        { error: "معرف الإشعار مطلوب" },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("notifications").doc(id.trim());
    const snap = await ref.get();

    if (!snap.exists || snap.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "الإشعار غير موجود أو غير مصرح بالوصول إليه" },
        { status: 404 }
      );
    }

    await ref.update({
      read: true,
      readAt: adminFieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/notifications:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الإشعار" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }

    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", true)
      .get();

    if (snap.empty) {
      return NextResponse.json({
        success: true,
        deleted: 0,
      });
    }

    // Firestore batches support at most 500 writes.
    const docs = snap.docs;
    let deleted = 0;

    for (let i = 0; i < docs.length; i += 500) {
      const batch = adminDb.batch();
      const chunk = docs.slice(i, i + 500);

      chunk.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();
      deleted += chunk.length;
    }

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    console.error("DELETE /api/notifications:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الإشعارات" },
      { status: 500 }
    );
  }
}