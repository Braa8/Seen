import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";

type Params = {
  params: {
    id: string;
  };
};

type PostStatus = "draft" | "pending" | "published" | "rejected";

type PostData = {
  title?: string;
  authorId?: string;
  status?: string;
  [key: string]: unknown;
};

const VALID_STATUSES: PostStatus[] = [
  "draft",
  "pending",
  "published",
  "rejected",
];

const EDITABLE_FIELDS = [
  "title",
  "content",
  "excerpt",
  "category",
  "tags",
  "featuredImage",
] as const;

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
    roles,
  };
}

function isEditorOrAdmin(roles: string[]) {
  return roles.includes("editor") || roles.includes("admin");
}

function isAdmin(roles: string[]) {
  return roles.includes("admin");
}

function isValidStatus(value: unknown): value is PostStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as PostStatus)
  );
}

function validateField(field: string, value: unknown): boolean {
  if (field === "tags") {
    return (
      Array.isArray(value) &&
      value.every((tag) => typeof tag === "string")
    );
  }

  return typeof value === "string";
}

async function notify(
  userId: string,
  type: string,
  title: string,
  message: string,
  postId: string
) {
  await adminDb.collection("notifications").add({
    userId,
    type,
    title,
    message,
    postId,
    read: false,
    createdAt: adminFieldValue.serverTimestamp(),
  });
}

async function notifyEditors(
  type: string,
  title: string,
  message: string,
  postId: string
) {
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
      notify(userId, type, title, message, postId)
    )
  );
}

// ========================================
// GET - جلب مقال واحد
// ========================================

export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const postRef = adminDb.collection("posts").doc(params.id);
    const snapshot = await postRef.get();

    if (!snapshot.exists) {
      return errorResponse("المقال غير موجود", 404);
    }

    const post = snapshot.data() as PostData;

    if (post.status !== "published") {
      const user = await getCurrentUser();

      const isAuthor =
        Boolean(user?.id) && post.authorId === user?.id;

      const canReview =
        user !== null && isEditorOrAdmin(user.roles);

      if (!isAuthor && !canReview) {
        return errorResponse(
          "ليس لديك صلاحية عرض هذا المقال",
          403
        );
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        id: snapshot.id,
        ...post,
      },
    });
  } catch (error) {
    console.error("GET /api/posts/[id]:", error);

    return errorResponse(
      "حدث خطأ أثناء جلب المقال",
      500
    );
  }
}

// ========================================
// PUT - تعديل المقال وتغيير حالته
// ========================================

export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "يجب تسجيل الدخول بحساب صالح",
        401
      );
    }

    const postRef = adminDb.collection("posts").doc(params.id);

    const snapshot = await postRef.get();

    if (!snapshot.exists) {
      return errorResponse("المقال غير موجود", 404);
    }

    const post = snapshot.data() as PostData;

    const isAuthor = post.authorId === user.id;
    const canReview = isEditorOrAdmin(user.roles);

    if (!isAuthor && !canReview) {
      return errorResponse(
        "ليس لديك صلاحية تعديل هذا المقال",
        403
      );
    }

    const currentStatus = post.status ?? "draft";

    if (
      !canReview &&
      currentStatus !== "draft" &&
      currentStatus !== "rejected"
    ) {
      return errorResponse(
        "لا يمكنك تعديل المقال أثناء المراجعة أو بعد النشر",
        403
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "بيانات الطلب غير صحيحة",
        400
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse(
        "بيانات الطلب غير صحيحة",
        400
      );
    }

    const input = body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};

    for (const field of EDITABLE_FIELDS) {
      if (input[field] === undefined) {
        continue;
      }

      const value = input[field];

      if (!validateField(field, value)) {
        return errorResponse(
          `قيمة الحقل ${field} غير صحيحة`,
          400
        );
      }

      if (
        ["title", "content", "category"].includes(field) &&
        typeof value === "string" &&
        !value.trim()
      ) {
        return errorResponse(
          `الحقل ${field} مطلوب`,
          400
        );
      }

      updates[field] =
        typeof value === "string" ? value.trim() : value;
    }

    let nextStatus = currentStatus;

    if (input.status !== undefined) {
      if (!isValidStatus(input.status)) {
        return errorResponse(
          "حالة المقال غير صحيحة",
          400
        );
      }

      nextStatus = input.status;

      if (!canReview) {
        const allowed =
          (currentStatus === "draft" ||
            currentStatus === "rejected") &&
          (nextStatus === "draft" ||
            nextStatus === "pending");

        if (!allowed) {
          return errorResponse(
            "ليس لديك صلاحية تغيير حالة المقال بهذه الطريقة",
            403
          );
        }
      } else {
        const transitions: Record<string, string[]> = {
          draft: ["draft", "pending", "published"],
          pending: ["pending", "draft", "published", "rejected"],
          published: ["published", "draft"],
          rejected: ["rejected", "draft", "pending", "published"],
        };

        if (!transitions[currentStatus]?.includes(nextStatus)) {
          return errorResponse(
            "انتقال حالة المقال غير مسموح",
            400
          );
        }
      }

      updates.status = nextStatus;
    }

    if (input.rejectionReason !== undefined) {
      if (!canReview) {
        return errorResponse(
          "ليس لديك صلاحية تحديد سبب الرفض",
          403
        );
      }

      if (
        nextStatus !== "rejected" ||
        typeof input.rejectionReason !== "string"
      ) {
        return errorResponse(
          "سبب الرفض غير صحيح",
          400
        );
      }

      updates.rejectionReason =
        input.rejectionReason.trim();
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(
        "لم يتم إرسال أي تعديلات",
        400
      );
    }

    const statusChanged = currentStatus !== nextStatus;

    if (statusChanged) {
      if (nextStatus === "published") {
        updates.publishedAt =
          adminFieldValue.serverTimestamp();
      }

      if (nextStatus === "pending") {
        updates.submittedAt =
          adminFieldValue.serverTimestamp();
      }

      if (nextStatus === "rejected") {
        updates.rejectedAt =
          adminFieldValue.serverTimestamp();
      }

      if (nextStatus !== "rejected") {
        updates.rejectionReason = null;
      }
    }

    updates.updatedAt =
      adminFieldValue.serverTimestamp();

    await postRef.update(updates);

    // إرسال الإشعارات بعد نجاح التعديل
    if (statusChanged) {
      try {
        const title =
          typeof updates.title === "string"
            ? updates.title
            : post.title ?? "مقال";

        if (nextStatus === "published" && post.authorId) {
          await notify(
            post.authorId,
            "post_published",
            "تم نشر مقالك",
            `تم نشر مقالك "${title}" بنجاح`,
            params.id
          );
        }

        if (nextStatus === "rejected" && post.authorId) {
          const reason =
            typeof updates.rejectionReason === "string"
              ? updates.rejectionReason
              : "";

          await notify(
            post.authorId,
            "post_rejected",
            "تم رفض مقالك",
            `تم رفض مقالك "${title}". ${
              reason ? `السبب: ${reason}` : ""
            }`,
            params.id
          );
        }

        if (nextStatus === "pending") {
          await notifyEditors(
            "new_post_pending",
            "مقال ينتظر المراجعة",
            `مقال "${title}" ينتظر مراجعتك`,
            params.id
          );
        }
      } catch (notificationError) {
        console.error(
          "Post notification error:",
          notificationError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث المقال بنجاح",
    });
  } catch (error) {
    console.error("PUT /api/posts/[id]:", error);

    return errorResponse(
      "حدث خطأ أثناء تعديل المقال",
      500
    );
  }
}

// ========================================
// DELETE - حذف المقال
// ========================================

export async function DELETE(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "يجب تسجيل الدخول بحساب صالح",
        401
      );
    }

    const postRef = adminDb.collection("posts").doc(params.id);

    const snapshot = await postRef.get();

    if (!snapshot.exists) {
      return errorResponse(
        "المقال غير موجود",
        404
      );
    }

    const post = snapshot.data() as PostData;

    const isAuthor = post.authorId === user.id;
    const admin = isAdmin(user.roles);

    const authorCanDelete =
      isAuthor &&
      (post.status === "draft" ||
        post.status === "rejected");

    if (!admin && !authorCanDelete) {
      return errorResponse(
        "ليس لديك صلاحية حذف هذا المقال",
        403
      );
    }

    await postRef.delete();

    return NextResponse.json({
      success: true,
      message: "تم حذف المقال بنجاح",
    });
  } catch (error) {
    console.error("DELETE /api/posts/[id]:", error);

    return errorResponse(
      "حدث خطأ أثناء حذف المقال",
      500
    );
  }
}