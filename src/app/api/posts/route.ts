import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb, adminFieldValue } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const authorId = searchParams.get("authorId");
    const limitNum = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

    const userRoles = session?.user?.roles ?? [];
    const canSeeAll = userRoles.some((r) => ["writer", "editor", "admin"].includes(r));

    let q = adminDb.collection("posts").orderBy("createdAt", "desc") as FirebaseFirestore.Query;

    if (status) {
      q = q.where("status", "==", status);
    } else if (!canSeeAll) {
      q = q.where("status", "==", "published");
    }

    if (category) q = q.where("category", "==", category);
    if (authorId) q = q.where("authorId", "==", authorId);

    q = q.limit(limitNum);
    const snap = await q.get();
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, posts, total: posts.length });
  } catch (error) {
    console.error("GET /posts error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب المقالات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    const roles = session.user.roles ?? ["viewer"];
    if (!roles.some((r) => ["writer", "editor", "admin"].includes(r))) {
      return NextResponse.json({ error: "ليس لديك صلاحية إنشاء مقال" }, { status: 403 });
    }

    const body = await request.json() as {
      title?: string;
      content?: string;
      excerpt?: string;
      category?: string;
      tags?: string[];
      featuredImage?: string;
      status?: string;
    };

    const { title, content, excerpt, category, tags = [], featuredImage = "", status = "draft" } = body;

    if (!title?.trim() || !content?.trim() || !category) {
      return NextResponse.json({ error: "العنوان والمحتوى والتصنيف مطلوبون" }, { status: 400 });
    }

    const now = adminFieldValue.serverTimestamp();
    const docRef = await adminDb.collection("posts").add({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim() || content.substring(0, 150) + "...",
      category,
      tags,
      featuredImage,
      status,
      authorId: session.user.id,
      authorName: session.user.name || session.user.email?.split("@")[0] || "كاتب",
      stats: { views: 0, likes: 0, comments: 0 },
      createdAt: now,
      updatedAt: now,
      publishedAt: status === "published" ? now : null,
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("POST /posts error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء المقال" }, { status: 500 });
  }
}
