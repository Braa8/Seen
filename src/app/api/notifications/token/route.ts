
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getFirebaseApiUser } from "@/lib/apiAuth";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";

function getTokenDocumentId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function getAuthenticatedUser(request: NextRequest) {
  return getFirebaseApiUser(request);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
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

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "بيانات الطلب غير صحيحة" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const token = data.token;
    const platform = data.platform;

    if (
      typeof token !== "string" ||
      !token.trim() ||
      token.length > 4096
    ) {
      return NextResponse.json(
        { error: "رمز الجهاز غير صالح" },
        { status: 400 }
      );
    }

    if (platform !== "android") {
      return NextResponse.json(
        { error: "المنصة غير مدعومة" },
        { status: 400 }
      );
    }

    const normalizedToken = token.trim();
    const tokenId = getTokenDocumentId(normalizedToken);

    const tokenRef = adminDb
      .collection("deviceTokens")
      .doc(tokenId);

    await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(tokenRef);

      transaction.set(
        tokenRef,
        {
          userId: user.uid,
          token: normalizedToken,
          platform,
          updatedAt: adminFieldValue.serverTimestamp(),
          lastSeenAt: adminFieldValue.serverTimestamp(),
          ...(existing.exists
            ? {}
            : {
                createdAt: adminFieldValue.serverTimestamp(),
              }),
        },
        { merge: true }
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/token:", error);

    return NextResponse.json(
      { error: "تعذر تسجيل جهاز الإشعارات" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
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

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "بيانات الطلب غير صحيحة" },
        { status: 400 }
      );
    }

    const token = (body as Record<string, unknown>).token;

    if (
      typeof token !== "string" ||
      !token.trim() ||
      token.length > 4096
    ) {
      return NextResponse.json(
        { error: "رمز الجهاز غير صالح" },
        { status: 400 }
      );
    }

    const tokenId = getTokenDocumentId(token.trim());

    const tokenRef = adminDb
      .collection("deviceTokens")
      .doc(tokenId);

    const tokenSnap = await tokenRef.get();

    if (tokenSnap.exists && tokenSnap.data()?.userId === user.uid) {
      await tokenRef.delete();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications/token:", error);

    return NextResponse.json(
      { error: "تعذر إلغاء تسجيل جهاز الإشعارات" },
      { status: 500 }
    );
  }
}
