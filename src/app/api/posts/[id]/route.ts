import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const snap = await adminDb.collection("posts").doc(params.id).get();
    if (!snap.exists) return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 });

    const data = snap.data()!;
    const roles = session?.user?.roles ?? [];
    const isAuthor = data.authorId === session?.user?.id;
    const canSeeAll = roles.some((r) => ["editor", "admin"].includes(r));

    if (data.status !== "published" && !isAuthor && !canSeeAll) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (data.status === "published") {
      await adminDb.collection("posts").doc(params.id).update({
        "stats.views": adminFieldValue.increment(1),
      });
    }

    return NextResponse.json({ success: true, post: { id: snap.id, ...data } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

    const snap = await adminDb.collection("posts").doc(params.id).get();
    if (!snap.exists) return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 });

    const data = snap.data()!;
    const roles = session.user.roles ?? ["viewer"];
    const isAuthor = data.authorId === session.user.id;
    const canEditAll = roles.some((r) => ["editor", "admin"].includes(r));

    if (!isAuthor && !canEditAll) {
      return NextResponse.json({ error: "ليس لديك صلاحية التعديل" }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;
    const allowed = ["title", "content", "excerpt", "category", "tags", "featuredImage", "status", "rejectionReason"];
    const updates: Record<string, unknown> = { updatedAt: adminFieldValue.serverTimestamp() };

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (body.status === "published" && data.status !== "published") {
      updates.publishedAt = adminFieldValue.serverTimestamp();
      await notify(data.authorId, "post_published", "تم نشر مقالك", `تم نشر مقالك "${data.title}" بنجاح`, params.id);
    }

    if (body.status === "rejected" && canEditAll) {
      updates.rejectedAt = adminFieldValue.serverTimestamp();
      await notify(data.authorId, "post_rejected", "تم رفض مقالك",
        `تم رفض مقالك "${data.title}". ${body.rejectionReason ? "السبب: " + body.rejectionReason : ""}`,
        params.id
      );
    }

    if (body.status === "pending" && data.status === "draft") {
      updates.submittedAt = adminFieldValue.serverTimestamp();
      await notifyEditors("new_post_pending", "مقال ينتظر المراجعة",
        `مقال "${body.title ?? data.title}" ينتظر مراجعتك`, params.id
      );
    }

    await adminDb.collection("posts").doc(params.id).update(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ أثناء التعديل" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

    const snap = await adminDb.collection("posts").doc(params.id).get();
    if (!snap.exists) return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 });

    const data = snap.data()!;
    const roles = session.user.roles ?? ["viewer"];
    const isAuthor = data.authorId === session.user.id;
    const isAdmin = roles.includes("admin");

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "ليس لديك صلاحية الحذف" }, { status: 403 });
    }

    await adminDb.collection("posts").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ أثناء الحذف" }, { status: 500 });
  }
}

async function notify(userId: string, type: string, title: string, message: string, postId?: string) {
  await adminDb.collection("notifications").add({
    userId, type, title, message, postId: postId ?? null,
    read: false, createdAt: adminFieldValue.serverTimestamp(),
  });
}

async function notifyEditors(type: string, title: string, message: string, postId?: string) {
  const snap = await adminDb.collection("users").where("roles", "array-contains", "editor").get();
  await Promise.all(snap.docs.map((d) => notify(d.id, type, title, message, postId)));
}
