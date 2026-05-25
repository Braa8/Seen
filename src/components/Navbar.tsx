"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Menu, X, LogOut, User, PenSquare, Layout, Shield } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const roles = session?.user?.roles ?? [];

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-sky-600 tracking-tight">
          سين
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/Posts" className="hover:text-sky-600 transition-colors">المقالات</Link>
          <Link href="/About" className="hover:text-sky-600 transition-colors">عن سين</Link>
          {roles.includes("writer") || roles.includes("editor") || roles.includes("admin") ? (
            <Link href="/WriterPage" className="hover:text-sky-600 transition-colors">كتاباتي</Link>
          ) : null}
          {roles.some((r) => ["editor", "admin"].includes(r)) && (
            <Link href="/EditorPage" className="hover:text-sky-600 transition-colors">المحرر</Link>
          )}
          {roles.includes("admin") && (
            <Link href="/AdminPage" className="hover:text-sky-600 transition-colors">الإدارة</Link>
          )}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <Link href="/Profile" className="flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition-colors">
                <User size={16} />
                {session.user.name ?? session.user.email?.split("@")[0]}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                <LogOut size={16} />
                خروج
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-600 hover:text-sky-600 transition-colors">دخول</Link>
              <Link href="/register" className="px-4 py-2 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 transition-colors">
                تسجيل
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-100 bg-white"
          >
            <div className="px-4 py-4 flex flex-col gap-4 text-sm font-medium text-slate-600">
              <Link href="/Posts" onClick={() => setMenuOpen(false)}>المقالات</Link>
              <Link href="/About" onClick={() => setMenuOpen(false)}>عن سين</Link>
              {session ? (
                <>
                  {roles.some((r) => ["writer", "editor", "admin"].includes(r)) && (
                    <Link href="/WriterPage" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                      <PenSquare size={16} /> كتاباتي
                    </Link>
                  )}
                  {roles.some((r) => ["editor", "admin"].includes(r)) && (
                    <Link href="/EditorPage" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                      <Layout size={16} /> المحرر
                    </Link>
                  )}
                  {roles.includes("admin") && (
                    <Link href="/AdminPage" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                      <Shield size={16} /> الإدارة
                    </Link>
                  )}
                  <Link href="/Profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                    <User size={16} /> الملف الشخصي
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2 text-red-500 text-right">
                    <LogOut size={16} /> تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)}>تسجيل الدخول</Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)}>إنشاء حساب</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
