"use client";

import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring } from "motion/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    try {
      setLoading(true);
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (!res || res.error) {
        setMessage("بيانات الدخول غير صحيحة أو البريد غير مُفعّل.");
        return;
      }
      setMessage("تم تسجيل الدخول بنجاح.");
      router.refresh();
    } catch {
      setMessage("حدث خطأ غير متوقع أثناء تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  };

  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), { damping: 30, stiffness: 100, mass: 2 });
  const rotateY = useSpring(useMotionValue(0), { damping: 30, stiffness: 100, mass: 2 });
  const scale = useSpring(1, { damping: 30, stiffness: 100, mass: 2 });

  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    const rotationX = (offsetY / (rect.height / 2)) * -8;
    const rotationY = (offsetX / (rect.width / 2)) * 8;
    rotateX.set(rotationX);
    rotateY.set(rotationY);
  }

  return (
    <div className="min-h-screen bg-indigo-300 flex items-center justify-center p-4">
      <motion.div
        ref={ref}
        className="w-full max-w-md bg-white border-2 border-black rounded-xl p-8 [perspective:1000px]"
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
          transform: 'translateZ(50px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)'
        }}
        onMouseMove={handleMouse}
        onMouseEnter={() => scale.set(1.03)}
        onMouseLeave={() => {
          scale.set(1);
          rotateX.set(0);
          rotateY.set(0);
        }}
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">🔐 تسجيل الدخول</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 ">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:cursor-pointer hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${message.includes('بنجاح') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
