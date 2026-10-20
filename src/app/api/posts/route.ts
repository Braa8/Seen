import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";
import { sanitizePostHtml } from "@/lib/sanitizePostHtml";
import type { Query } from "firebase-admin/firestore";

type PostStatus = "draft" | "pending" | "published" | "rejected";

const VALID_STATUSES: PostStatus[] = [
  "draft",
  "pending",
  "published",
  "rejected",
];

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const userDoc = await adminDb
    .collection("users")
    .doc(session.user.id)
    .get();

  if (!userDoc.exists) {
    return null;
  }

  const data = userDoc.data();

  const roles: string[] = Array.isArray(data?.roles)
    ? data.roles.filter(
        (role: unknown): role is string =>
          typeof role === "string"
      )
    : [];

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    roles,
  };
}

function isEditorOrAdmin(roles: string[]): boolean {
  return roles.includes("editor") || roles.includes("admin");
}

function canWrite(roles: string[]): boolean {
  return (
    roles.includes("writer") ||
    roles.includes("editor") ||
    roles.includes("admin")
  );
}

function isValidStatus(value: unknown): value is PostStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as PostStatus)
  );
}

function parseLimit(value: string | null): number {
  if (!value) return 20;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 20;
  }

  return Math.min(parsed, 100);
}

// ========================================
// GET - جلب المقالات
// ========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const authorId = searchParams.get("authorId");
    const limitNum = parseLimit(searchParams.get("limit"));

    const user = await getCurrentUser();

    const roles = user?.roles ?? [];
    const canReview = isEditorOrAdmin(roles);
    const writer = canWrite(roles);

    if (status && !isValidStatus(status)) {
      return errorResponse("حالة المقال غير صحيحة", 400);
    }

    // المستخدم العادي يرى المقالات المنشورة فقط.
    if (!writer && status && status !== "published") {
      return errorResponse(
        "ليس لديك صلاحية عرض المقالات غير المنشورة",
        403
      );
    }

    // الكاتب لا يستطيع طلب مسودات كاتب آخر.
    if (
      !canReview &&
      status !== "published" &&
      authorId &&
      authorId !== user?.id
    ) {
      return errorResponse(
        "ليس لديك صلاحية عرض مقالات هذا الكاتب",
        403
      );
    }

    let query: Query = adminDb
      .collection("posts")
      .orderBy("createdAt", "desc");

    if (canReview) {
      // المحرر والمدير يستطيعان عرض جميع المقالات.
      if (status) {
        query = query.where("status", "==", status);
      }

      if (authorId) {
        query = query.where("authorId", "==", authorId);
      }
    } else if (writer && status && status !== "published") {
      // الكاتب يرى مقالاته غير المنشورة فقط.
      query = query
        .where("status", "==", status)
        .where("authorId", "==", user!.id);
    } else {
      // الطلبات العامة تعرض المقالات المنشورة فقط.
      query = query.where("status", "==", "published");

      if (authorId) {
        query = query.where("authorId", "==", authorId);
      }
    }

    if (category) {
      query = query.where("category", "==", category);
    }

    query = query.limit(limitNum);

    const snapshot = await query.get();

    const posts = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        content:
          typeof data.content === "string"
            ? sanitizePostHtml(data.content)
            : "",
      };
    });

    return NextResponse.json({
      success: true,
      posts,
      total: posts.length,
    });
  } catch (error) {
    console.error("GET /api/posts:", error);

    return errorResponse(
      "حدث خطأ أثناء جلب المقالات",
      500
    );
  }
}

// ========================================
// POST - إنشاء مقال جديد
// ========================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "يجب تسجيل الدخول بحساب صالح",
        401
      );
    }

    if (!canWrite(user.roles)) {
      return errorResponse(
        "ليس لديك صلاحية إنشاء مقال",
        403
      );
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

    const input = body as Record<string, unknown>;

    const {
      title,
      content,
      excerpt = "",
      category,
      tags = [],
      featuredImage = "",
      status = "draft",
    } = input;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string" ||
      !content.trim() ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return errorResponse(
        "العنوان والمحتوى والتصنيف مطلوبون",
        400
      );
    }

    if (
      typeof excerpt !== "string" ||
      typeof featuredImage !== "string"
    ) {
      return errorResponse(
        "بيانات المقال غير صحيحة",
        400
      );
    }

    if (
      !Array.isArray(tags) ||
      !tags.every((tag) => typeof tag === "string")
    ) {
      return errorResponse(
        "صيغة الوسوم غير صحيحة",
        400
      );
    }

    if (!isValidStatus(status)) {
      return errorResponse(
        "حالة المقال غير صحيحة",
        400
      );
    }

    const canReview = isEditorOrAdmin(user.roles);

    const sanitizedContent = sanitizePostHtml(content);

    if (!sanitizedContent.trim()) {
      return errorResponse(
        "محتوى المقال فارغ أو يحتوي على عناصر غير مسموحة",
        400
      );
    }

    // لا يُسمح بإنشاء مقال مرفوض مباشرة.
    if (status === "rejected") {
      return errorResponse(
        "لا يمكن إنشاء مقال بحالة مرفوض",
        400
      );
    }

    // النشر المباشر للمحرر والمدير فقط.
    if (status === "published" && !canReview) {
      return errorResponse(
        "ليس لديك صلاحية نشر المقال مباشرة",
        403
      );
    }

    const now = adminFieldValue.serverTimestamp();

    const docRef = await adminDb.collection("posts").add({
      title: title.trim(),
      content: sanitizedContent,
      excerpt:
        excerpt.trim() ||
        sanitizedContent.substring(0, 150) + "...",
      category: category.trim(),
      tags: tags.map((tag: string) => tag.trim()),
      featuredImage: featuredImage.trim(),
      status,

      authorId: user.id,
      authorName:
        user.name ||
        user.email?.split("@")[0] ||
        "كاتب",

      stats: {
        views: 0,
        likes: 0,
        comments: 0,
      },

      createdAt: now,
      updatedAt: now,

      publishedAt:
        status === "published" ? now : null,

      submittedAt:
        status === "pending" ? now : null,
    });

    // إشعار المحررين عند إرسال المقال للمراجعة.
    if (status === "pending") {
      try {
        const editors = await adminDb
          .collection("users")
          .where("roles", "array-contains", "editor")
          .get();

        const admins = await adminDb
          .collection("users")
          .where("roles", "array-contains", "admin")
          .get();

        const recipients = new Set<string>();

        editors.docs.forEach((doc) => recipients.add(doc.id));
        admins.docs.forEach((doc) => recipients.add(doc.id));

        await Promise.all(
          [...recipients].map((userId) =>
            adminDb.collection("notifications").add({
              userId,
              type: "new_post_pending",
              title: "مقال ينتظر المراجعة",
              message: `مقال "${title.trim()}" ينتظر مراجعتك`,
              postId: docRef.id,
              read: false,
              createdAt: adminFieldValue.serverTimestamp(),
            })
          )
        );
      } catch (notificationError) {
        console.error(
          "Post notification error:",
          notificationError
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: docRef.id,
        message: "تم إنشاء المقال بنجاح",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/posts:", error);

    return errorResponse(
      "حدث خطأ أثناء إنشاء المقال",
      500
    );
  }
}