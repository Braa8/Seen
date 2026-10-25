import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { getFirebaseApiUser } from "@/lib/apiAuth";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";
import { sanitizePostHtml } from "@/lib/sanitizePostHtml";

const MAX_FAVORITES_PER_REQUEST = 100;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    const userDoc = await adminDb
      .collection("users")
      .doc(session.user.id)
      .get();

    const userData = userDoc.data();

    if (
      !userDoc.exists ||
      !userData ||
      userData.isActive === false
    ) {
      return null;
    }

    return session.user.id;
  }

  const firebaseUser = await getFirebaseApiUser(request);

  return firebaseUser?.uid ?? null;
}

function isValidPostId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 1500 &&
    !value.includes("/")
  );
}

// ========================================
// GET - جلب المقالات المفضلة
// ========================================

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return errorResponse("يجب تسجيل الدخول", 401);
    }

    const favoritesSnapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("favorites")
      .orderBy("savedAt", "desc")
      .limit(MAX_FAVORITES_PER_REQUEST)
      .get();

    const favoriteDocs = favoritesSnapshot.docs;

    const posts = await Promise.all(
      favoriteDocs.map(async (favoriteDoc) => {
        const postId = favoriteDoc.id;

        const postSnapshot = await adminDb
          .collection("posts")
          .doc(postId)
          .get();

        if (!postSnapshot.exists) {
          return null;
        }

        const post = postSnapshot.data();

        // لا نعرض المقالات غير المنشورة للمستخدم العادي.
        if (!post || post.status !== "published") {
          return null;
        }

        return {
          id: postSnapshot.id,
          ...post,
          content:
            typeof post.content === "string"
              ? sanitizePostHtml(post.content)
              : "",
          savedAt: favoriteDoc.data().savedAt ?? null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      favorites: posts.filter((post) => post !== null),
      hasMore:
        favoriteDocs.length === MAX_FAVORITES_PER_REQUEST,
    });
  } catch (error) {
    console.error("GET /api/favorites:", error);

    return errorResponse(
      "حدث خطأ أثناء جلب المقالات المفضلة",
      500
    );
  }
}

// ========================================
// POST - إضافة مقال إلى المفضلة
// ========================================

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return errorResponse("يجب تسجيل الدخول", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("بيانات الطلب غير صحيحة", 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse("بيانات الطلب غير صحيحة", 400);
    }

    const postId = (body as Record<string, unknown>).postId;

    if (!isValidPostId(postId)) {
      return errorResponse("معرف المقال غير صحيح", 400);
    }

    const normalizedPostId = postId.trim();

    const postRef = adminDb
      .collection("posts")
      .doc(normalizedPostId);

    const postSnapshot = await postRef.get();

    if (!postSnapshot.exists) {
      return errorResponse("المقال غير موجود", 404);
    }

    const post = postSnapshot.data();

    if (!post || post.status !== "published") {
      return errorResponse(
        "لا يمكن حفظ مقال غير منشور",
        403
      );
    }

    const favoriteRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("favorites")
      .doc(normalizedPostId);

    const existingFavorite = await favoriteRef.get();

    if (existingFavorite.exists) {
      return NextResponse.json({
        success: true,
        alreadySaved: true,
        message: "المقال موجود بالفعل في المفضلة",
      });
    }

    await favoriteRef.set({
      postId: normalizedPostId,
      savedAt: adminFieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        alreadySaved: false,
        message: "تمت إضافة المقال إلى المفضلة",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/favorites:", error);

    return errorResponse(
      "حدث خطأ أثناء إضافة المقال إلى المفضلة",
      500
    );
  }
}

// ========================================
// DELETE - إزالة مقال من المفضلة
// ========================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return errorResponse("يجب تسجيل الدخول", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("بيانات الطلب غير صحيحة", 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse("بيانات الطلب غير صحيحة", 400);
    }

    const postId = (body as Record<string, unknown>).postId;

    if (!isValidPostId(postId)) {
      return errorResponse("معرف المقال غير صحيح", 400);
    }

    const favoriteRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("favorites")
      .doc(postId.trim());

    const favoriteSnapshot = await favoriteRef.get();

    if (!favoriteSnapshot.exists) {
      return NextResponse.json({
        success: true,
        removed: false,
        message: "المقال غير موجود في المفضلة",
      });
    }

    await favoriteRef.delete();

    return NextResponse.json({
      success: true,
      removed: true,
      message: "تمت إزالة المقال من المفضلة",
    });
  } catch (error) {
    console.error("DELETE /api/favorites:", error);

    return errorResponse(
      "حدث خطأ أثناء إزالة المقال من المفضلة",
      500
    );
  }
}