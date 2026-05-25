import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminFieldValue } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json() as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email: email.trim(),
      password,
      displayName: displayName?.trim() || email.split("@")[0],
    });

    const now = adminFieldValue.serverTimestamp();

    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: displayName?.trim() || email.split("@")[0],
      roles: ["viewer"],
      isActive: true,
      createdAt: now,
      profile: { bio: "", avatar: "" },
      stats: { postsCount: 0, publishedCount: 0 },
    });

    await adminDb.collection("notifications").add({
      userId: userRecord.uid,
      type: "welcome",
      title: "مرحباً بك في سين!",
      message: "تم إنشاء حسابك بنجاح. ابدأ باستكشاف المنصة.",
      read: false,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      userId: userRecord.uid,
    });
  } catch (error: unknown) {
    console.error("Register error:", error);
    const code = (error as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
    }
    if (code === "auth/weak-password") {
      return NextResponse.json({ error: "كلمة المرور ضعيفة جداً" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الحساب" }, { status: 500 });
  }
}
