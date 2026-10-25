import { NextRequest, NextResponse } from "next/server";
import {
  adminAuth,
  adminDb,
  adminFieldValue,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type RegisterBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

export async function POST(request: NextRequest) {
  let createdUserUid: string | null = null;
  let profileSaved = false;

  try {
    let body: RegisterBody;

    try {
      body = (await request.json()) as RegisterBody;
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const displayName = body.displayName?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    if (email.length > 254) {
      return NextResponse.json(
        { error: "البريد الإلكتروني طويل جداً" },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: "يجب أن تكون كلمة المرور بين 6 و128 محرفاً" },
        { status: 400 }
      );
    }

    if (displayName && displayName.length > 100) {
      return NextResponse.json(
        { error: "الاسم يجب ألا يتجاوز 100 محرف" },
        { status: 400 }
      );
    }

    const finalDisplayName =
      displayName || email.split("@")[0];

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: finalDisplayName,
    });

    createdUserUid = userRecord.uid;

    const userRef = adminDb
      .collection("users")
      .doc(userRecord.uid);

    await userRef.create({
      uid: userRecord.uid,
      email: userRecord.email ?? email,
      displayName: finalDisplayName,
      roles: ["viewer"],
      isActive: true,
      createdAt: adminFieldValue.serverTimestamp(),
      profile: {
        bio: "",
        avatar: "",
      },
      stats: {
        postsCount: 0,
        publishedCount: 0,
      },
    });

    profileSaved = true;

    // فشل إشعار الترحيب لا ينبغي أن يبطل الحساب الذي أُنشئ بنجاح.
    try {
      await adminDb.collection("notifications").add({
        userId: userRecord.uid,
        type: "welcome",
        title: "مرحباً بك في سين!",
        message: "تم إنشاء حسابك بنجاح. ابدأ باستكشاف المنصة.",
        read: false,
        createdAt: adminFieldValue.serverTimestamp(),
      });
    } catch (notificationError) {
      console.error(
        "Welcome notification creation failed:",
        notificationError
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "تم إنشاء الحساب بنجاح",
        userId: userRecord.uid,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Register error:", error);

    // إذا أُنشئ مستخدم Firebase وفشل حفظ ملفه في Firestore،
    // نحاول حذف المستخدم لتجنب ترك حساب ناقص البيانات.
    if (createdUserUid && !profileSaved) {
      try {
        await adminAuth.deleteUser(createdUserUid);
      } catch (rollbackError) {
        console.error(
          "Failed to roll back incomplete Firebase user:",
          rollbackError
        );
      }
    }

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String(error.code)
        : "";

    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم بالفعل" },
        { status: 409 }
      );
    }

    if (code === "auth/invalid-email") {
      return NextResponse.json(
        { error: "صيغة البريد الإلكتروني غير صحيحة" },
        { status: 400 }
      );
    }

    if (code === "auth/weak-password") {
      return NextResponse.json(
        { error: "كلمة المرور ضعيفة جداً" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الحساب. حاول مجدداً." },
      { status: 500 }
    );
  }
}