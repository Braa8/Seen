"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (!result || result.error || !result.ok) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة، أو تعذّر تسجيل الدخول.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً.");
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              placeholder="أدخل كلمة المرور"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "جاري تسجيل الدخول..." : "دخول"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="text-sky-600 font-semibold hover:underline"
          >
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  );
}