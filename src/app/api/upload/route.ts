import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";

import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const MAX_SIZE = 4 * 1024 * 1024;

type AllowedImageType = (typeof ALLOWED_TYPES)[number];

async function getCurrentUploaderId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return null;

  const userSnapshot = await adminDb
    .collection("users")
    .doc(userId)
    .get();

  if (!userSnapshot.exists) return null;

  const userData = userSnapshot.data();

  if (!userData || userData.isActive === false) {
    return null;
  }

  const roles: unknown[] = Array.isArray(userData.roles)
    ? userData.roles
    : [];

  const canUpload = roles.some(
    (role) =>
      role === "writer" ||
      role === "editor" ||
      role === "admin"
  );

  return canUpload ? userId : null;
}

function matchesImageSignature(
  bytes: Uint8Array,
  type: AllowedImageType
): boolean {
  if (type === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (type === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (type === "image/gif") {
    if (bytes.length < 6) return false;

    const signature = String.fromCharCode(...bytes.slice(0, 6));

    return signature === "GIF87a" || signature === "GIF89a";
  }

  if (type === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }

    const userId = await getCurrentUploaderId();

    if (!userId) {
      return NextResponse.json(
        { error: "ليست لديك صلاحية لرفع الصور" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (
      !file ||
      typeof file === "string" ||
      typeof file.arrayBuffer !== "function"
    ) {
      return NextResponse.json(
        { error: "لم يتم اختيار ملف صالح" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type as AllowedImageType)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "الملف فارغ" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "حجم الصورة كبير جداً (الحد 4MB)" },
        { status: 400 }
      );
    }

    const imageType = file.type as AllowedImageType;
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (!matchesImageSignature(bytes, imageType)) {
      return NextResponse.json(
        { error: "محتوى الملف لا يتطابق مع نوع الصورة" },
        { status: 400 }
      );
    }

    const safeName =
      file.name
        .split(/[\\/]/)
        .pop()
        ?.replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-100) || "image";

    const blob = await put(
      `articles/${userId}/${safeName}`,
      arrayBuffer,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: imageType,
        cacheControlMaxAge: 60 * 60 * 24 * 30,
      }
    );

    return NextResponse.json({
      success: true,
      file: {
        url: blob.url,
        size: file.size,
        type: imageType,
        originalName: file.name,
      },
    });
  } catch (error) {
    console.error("Image upload error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء رفع الصورة" },
      { status: 500 }
    );
  }
}