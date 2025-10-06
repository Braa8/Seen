"use client";

import { useState, useRef } from "react";
import app, { db } from "../../lib/firebase";
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { motion, useMotionValue, useSpring } from "motion/react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const auth = getAuth(app);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // تحقق مسبقًا إن كان البريد مستخدمًا بالفعل
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods && methods.length > 0) {
        setMessage("هذا البريد مسجّل مسبقًا. يرجى تسجيل الدخول.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // إنشاء مستند للمستخدم في Firestore لتخزين الأدوار
      if (userCredential.user?.uid) {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          roles: ["viewer"],
        }, { merge: true });
      }

      // أرسل بريد التحقق عبر مسارنا المخصص كي نستطيع التحكم في القالب والمرسل
      try {
        await fetch("/api/verify/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch {}
      setMessage("تم إرسال رسالة تأكيد إلى بريدك الإلكتروني .. يُرجى تأكيد البريد قبل تسجيل الدخول");
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === "auth/email-already-in-use") {
        setMessage("هذا البريد مسجّل مسبقًا. يرجى تسجيل الدخول.");
      } else if (err.code === "weak-password") {
        setMessage("كلمة المرور ضعيفة. الرجاء استخدام كلمة أقوى.");
      } else if (err.code === "invalid-email") {
        setMessage("صيغة البريد الإلكتروني غير صحيحة.");
      } else {
        setMessage(`حدث خطأ: ${err.message || "حدث خطأ غير معروف"}`);
      }
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
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">✨ إنشاء حساب جديد</h2>
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">يجب أن تكون 6 أحرف على الأقل</p>
          </div>
          <button 
            type="submit" 
            className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition hover:cursor-pointer"
          >
            إنشاء حساب
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold">
              تسجيل الدخول
            </Link>
          </p>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${message.includes('تم') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
