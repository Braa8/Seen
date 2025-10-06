import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function ensureAdminApp() {
  if (!getApps().length) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error("Firebase Admin SDK environment variables are missing!");
    }
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
}

export async function POST(request: Request) {
  try {
    const { email, redirectUrl } = (await request.json()) as { email?: string; redirectUrl?: string };
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    ensureAdminApp();
    const auth = getAuth();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const actionUrl = redirectUrl || `${appUrl}/login?verified=1`;
    const link = await auth.generateEmailVerificationLink(email, {
      url: actionUrl,
      handleCodeInApp: false,
    });

    // Configure SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: Boolean(process.env.SMTP_SECURE === "true"),
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });

    const from = process.env.FROM_EMAIL || "no-reply@example.com";
    const subject = "تأكيد بريدك الإلكتروني";
    const html = `
      <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right">
        <h2>مرحبًا!</h2>
        <p>اضغط الزر أدناه لتأكيد بريدك الإلكتروني وإكمال إنشاء الحساب.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">تأكيد البريد</a>
        </p>
        <p>أو انسخ الرابط التالي في المتصفح:</p>
        <p><a href="${link}">${link}</a></p>
      </div>
    `;

    await transporter.sendMail({ from, to: email, subject, html });

    return NextResponse.json({ ok: true });
  } catch {
    // Do not leak internal errors; log minimal info in production
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}


