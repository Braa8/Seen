import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { getFirebaseApiUser } from "@/lib/apiAuth";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";

type Params = {
  params: {
    id: string;
  };
};

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

function isValidPostId(postId: string): boolean {
  return (
    postId.length > 0 &&
    postId.length <= 1500 &&
    !postId.includes("/")
  );
}

async function getPublishedPost(postId: string) {
  const postRef = adminDb.collection("posts").doc(postId);
  const postSnapshot = await postRef.get();

  if (!postSnapshot.exists) {
    return null;
  }

  const post = postSnapshot.data();

  if (!post || post.status !== "published") {
    return null;
  }

  return postRef;
}

// ========================================
// GET - معرفة حالة الإعجاب وعدد الإعجابات
// ========================================

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const postId = params.id;

    if (!isValidPostId(postId)) {
      return errorResponse("معرف المقال غير صحيح", 400);
    }

    const postRef = await getPublishedPost(postId);

    if (!postRef) {
      return errorResponse("المقال غير موجود أو غير منشور", 404);
    }

    const userId = await getAuthenticatedUserId(request);

    const likesRef = postRef.collection("likes");

    const countSnapshot = await likesRef.count().get();

    let liked = false;

    if (userId) {
      const userLike = await likesRef.doc(userId).get();
      liked = userLike.exists;
    }

    return NextResponse.json({
      success: true,
      postId,
      likesCount: countSnapshot.data().count,
      liked,
    });
  } catch (error) {
    console.error("GET /api/posts/[id]/like:", error);

    return errorResponse(
      "حدث خطأ أثناء جلب معلومات الإعجابات",
      500
    );
  }
}

// ========================================
// POST - تبديل حالة الإعجاب
// ========================================

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return errorResponse("يجب تسجيل الدخول للإعجاب بالمقال", 401);
    }

    const postId = params.id;

    if (!isValidPostId(postId)) {
      return errorResponse("معرف المقال غير صحيح", 400);
    }

    const postRef = await getPublishedPost(postId);

    if (!postRef) {
      return errorResponse("المقال غير موجود أو غير منشور", 404);
    }

    const likeRef = postRef.collection("likes").doc(userId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const likeSnapshot = await transaction.get(likeRef);

      if (likeSnapshot.exists) {
        transaction.delete(likeRef);

        return {
          liked: false,
          message: "تم إلغاء الإعجاب",
        };
      }

      transaction.set(likeRef, {
        userId,
        createdAt: adminFieldValue.serverTimestamp(),
      });

      return {
        liked: true,
        message: "تم تسجيل الإعجاب",
      };
    });

    const countSnapshot = await postRef
      .collection("likes")
      .count()
      .get();

    return NextResponse.json({
      success: true,
      postId,
      liked: result.liked,
      likesCount: countSnapshot.data().count,
      message: result.message,
    });
  } catch (error) {
    console.error("POST /api/posts/[id]/like:", error);

    return errorResponse(
      "حدث خطأ أثناء تحديث الإعجاب",
      500
    );
  }
}