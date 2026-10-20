import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_TEXT_LENGTH = 200_000;

const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function canExtractDocuments(userId: string): Promise<boolean> {
  const snapshot = await adminDb.collection("users").doc(userId).get();

  if (!snapshot.exists) {
    return false;
  }

  const userData = snapshot.data();

  if (!userData || userData.isActive === false) {
    return false;
  }

  const roles: unknown[] = Array.isArray(userData.roles)
    ? userData.roles
    : [];

  return roles.some(
    (role) =>
      role === "writer" ||
      role === "editor" ||
      role === "admin"
  );
}

export async function POST(request: NextRequest) {
  let pdfParser: PDFParse | null = null;

  try {
    // 1. التحقق من تسجيل الدخول
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    // 2. التحقق من الصلاحيات من قاعدة البيانات
    const allowed = await canExtractDocuments(userId);

    if (!allowed) {
      return NextResponse.json(
        { error: "ليست لديك صلاحية استيراد المستندات" },
        { status: 403 }
      );
    }

    // 3. استقبال الملف والتحقق منه
    const formData = await request.formData();
    const file = formData.get("file");

    if (
      !file ||
      typeof file === "string" ||
      typeof file.arrayBuffer !== "function"
    ) {
      return NextResponse.json(
        { error: "يرجى اختيار ملف Word أو PDF صالح" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "الملف فارغ" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز الحد المسموح وهو 4MB" },
        { status: 400 }
      );
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (extension !== "docx" && extension !== "pdf") {
      return NextResponse.json(
        { error: "الصيغ المدعومة حالياً هي DOCX وPDF فقط" },
        { status: 400 }
      );
    }

    if (extension === "docx" && file.type !== DOCX_TYPE) {
      return NextResponse.json(
        { error: "نوع ملف Word غير صالح" },
        { status: 400 }
      );
    }

    if (extension === "pdf" && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "نوع ملف PDF غير صالح" },
        { status: 400 }
      );
    }

    // 4. قراءة محتوى الملف والتحقق من توقيعه
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (extension === "pdf") {
      const signature = new TextDecoder().decode(bytes.slice(0, 5));

      if (signature !== "%PDF-") {
        return NextResponse.json(
          { error: "محتوى الملف لا يتطابق مع صيغة PDF" },
          { status: 400 }
        );
      }
    }

    let extractedText = "";

    // 5. استخراج النص من Word أو PDF
    if (extension === "docx") {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(arrayBuffer),
      });

      extractedText = result.value;
    } else {
      pdfParser = new PDFParse({
        data: bytes,
      });

      const result = await pdfParser.getText();

      extractedText = result.text;
    }

    // 6. تنظيف النص والتحقق من النتيجة
    extractedText = extractedText
      .replace(/\r\n?/g, "\n")
      .replace(/\u0000/g, "")
      .trim();

    if (!extractedText) {
      return NextResponse.json(
        {
          error:
            "لم يتم العثور على نص قابل للاستخراج. قد يكون ملف PDF ممسوحاً ضوئياً ويحتاج إلى OCR.",
        },
        { status: 422 }
      );
    }

    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.slice(0, MAX_TEXT_LENGTH);
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: file.name,
      truncated: extractedText.length >= MAX_TEXT_LENGTH,
    });
  } catch (error) {
    console.error("Document text extraction error:", error);

    return NextResponse.json(
      {
        error:
          "تعذر استخراج النص من الملف. تأكد من سلامة المستند وحاول مجدداً.",
      },
      { status: 500 }
    );
  } finally {
    if (pdfParser) {
      try {
        await pdfParser.destroy();
      } catch (error) {
        console.error("PDF parser cleanup error:", error);
      }
    }
  }
}