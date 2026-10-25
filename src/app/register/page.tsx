"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        }),
        cache: "no-store",
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        success?: boolean;
      };

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(data.error ?? "تعذّر إنشاء الحساب. حاول مجدداً.");
        return;
      }

      // تسجيل الدخول تلقائياً بعد إنشاء الحساب.
      const loginResult = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (!loginResult || loginResult.error || !loginResult.ok) {
        setIsError(true);
        setMessage(
          "تم إنشاء الحساب بنجاح، لكن تعذّر تسجيل الدخول تلقائياً. يمكنك تسجيل الدخول من الصفحة المخصصة."
        );
        return;
      }

      setMessage("تم إنشاء الحساب وتسجيل الدخول بنجاح. جارٍ التحويل...");

      router.replace("/Posts");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage(
        "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
        <div className="text-center mb-8 flex flex-col justify-center items-center">
                 <Image alt="logo" src="/logo.png" width={100} height={50} />
        
                  <p className="text-slate-500 text-sm font-bold">
                    تسجيل الدخول إلى حسابك
                  </p>
                </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              الاسم
            </label>

            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              placeholder="أدخل اسمك"
              required
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              البريد الإلكتروني
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              placeholder="example@email.com"
              required
              maxLength={254}
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              كلمة المرور
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              placeholder="6 أحرف على الأقل"
              required
              minLength={6}
              maxLength={128}
              disabled={loading}
            />
          </div>

          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`text-sm px-4 py-3 rounded-lg ${
                isError
                  ? "bg-red-50 text-red-600"
                  : "bg-green-50 text-green-600"
              }`}
            >
              {message}

              {isError && message.includes("تم إنشاء الحساب بنجاح") && (
                <div className="mt-2">
                  <Link
                    href="/login"
                    className="font-semibold underline"
                  >
                    الانتقال إلى تسجيل الدخول
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/login"
            className="text-sky-600 font-semibold hover:underline"
          >
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}