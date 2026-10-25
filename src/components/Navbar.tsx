"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  User,
  PenSquare,
  LayoutDashboard,
  Shield,
  Puzzle,
  Newspaper,
  Info,
  ChevronDown,
  ArrowLeft,
  Bookmark,
  Download,
} from "lucide-react";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Newspaper;
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const roles = Array.isArray(session?.user?.roles)
    ? session.user.roles
    : [];

  const isAuthenticated = status === "authenticated";

  const isWriter = roles.some((role) =>
    ["writer", "editor", "admin"].includes(role)
  );

  const isEditor = roles.some((role) =>
    ["editor", "admin"].includes(role)
  );

  const isAdmin = roles.includes("admin");

  const privateLinks: NavigationItem[] = [];

  if (isAuthenticated) {
    privateLinks.push({
      label: "مقالاتي المفضلة",
      href: "/Favorites",
      icon: Bookmark,
   });
  }
  if (isAuthenticated) {
    privateLinks.push({
      label: "مقالات محمّلة",
      href: "/OfflineReading",
      icon: Download,
   });
  }
  
  if (isAuthenticated && isWriter) {
    privateLinks.push({
      label: "كتاباتي",
      href: "/WriterPage",
      icon: PenSquare,
    });
  }

  if (isAuthenticated && isEditor) {
    privateLinks.push({
      label: "المحرر",
      href: "/EditorPage",
      icon: LayoutDashboard,
    });
  }

  if (isAuthenticated && isAdmin) {
    privateLinks.push({
      label: "الإدارة",
      href: "/AdminPage",
      icon: Shield,
    });
  }

  const publicLinks: NavigationItem[] = [
  {
    label: "المقالات",
    href: "/Posts",
    icon: Newspaper,
  },
  {
    label: "لغز اليوم",
    href: "/Puzzle",
    icon: Puzzle,
  },
  {
    label: "من نحن",
    href: "/About",
    icon: Info,
  },
];

  const allLinks = [...privateLinks, ...publicLinks];

  const displayName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "حسابي";

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/" && pathname.startsWith(`${href}/`));

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    setAccountOpen(false);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <nav
      dir="rtl"
      className="sticky top-0 z-50 border-b border-white/10 bg-sky-950 text-white shadow-lg shadow-sky-950/10"
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          aria-label="الصفحة الرئيسية لصحيفة سين"
          className="flex shrink-0 items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 transition hover:bg-white/15">
            <Image
              src="/logo.png"
              alt="سين"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              priority
            />
          </div>

          <div className="hidden flex-col sm:flex">
            <span className="text-[10px] font-medium tracking-wide text-sky-200/70">
              معرفة • فكر • ثقافة
            </span>
          </div>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {allLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-sky-100/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  size={17}
                  className={
                    active
                      ? "text-sky-300"
                      : "text-sky-200/70 transition-colors group-hover:text-sky-300"
                  }
                />

                {item.label}

                {active && (
                  <motion.span
                    layoutId="navbar-active"
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-sky-400"
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Desktop account actions */}
        <div className="hidden items-center gap-3 lg:flex">
          {status === "loading" ? (
            <div className="h-10 w-28 animate-pulse rounded-xl bg-white/10" />
          ) : isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex max-w-[210px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 transition hover:bg-white/15"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-200">
                  <User size={17} />
                </span>

                <span className="truncate text-sm font-semibold">
                  {displayName}
                </span>

                <ChevronDown
                  size={15}
                  className={`shrink-0 text-sky-200/70 transition-transform ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {accountOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="إغلاق قائمة الحساب"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setAccountOpen(false)}
                    />

                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                      className="absolute left-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-2xl"
                    >
                      <div className="border-b border-slate-100 px-3 py-3">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {displayName}
                        </p>

                        {session?.user?.email && (
                          <p
                            dir="ltr"
                            className="mt-1 truncate text-right text-xs text-slate-500"
                          >
                            {session.user.email}
                          </p>
                        )}
                      </div>

                      <Link
                        href="/Profile"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-slate-50"
                      >
                        <User size={17} className="text-sky-700" />
                        الملف الشخصي
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut size={17} />
                        تسجيل الخروج
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-white/10 hover:text-white"
              >
                تسجيل الدخول
              </Link>

              <Link
                href="/register"
                className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-900/20 transition hover:bg-sky-400"
              >
                إنشاء حساب
                <ArrowLeft size={16} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
          aria-controls="seen-mobile-navigation"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 lg:hidden"
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {/* Mobile navigation */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="seen-mobile-navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-white/10 bg-sky-950 lg:hidden"
          >
            <div className="mx-auto max-h-[calc(100dvh-72px)] max-w-7xl overflow-y-auto px-4 py-5 sm:px-6">
              <div className="space-y-1">
                {allLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                        active
                          ? "bg-sky-500/20 text-white"
                          : "text-sky-100/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon
                        size={19}
                        className={
                          active ? "text-sky-300" : "text-sky-200/70"
                        }
                      />

                      {item.label}

                      {active && (
                        <span className="mr-auto h-2 w-2 rounded-full bg-sky-400" />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-white/10 pt-5">
                {status === "loading" ? (
                  <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                ) : isAuthenticated ? (
                  <>
                    <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-200">
                        <User size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {displayName}
                        </p>

                        <p className="truncate text-xs text-sky-200/60">
                          حسابك في سين
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/Profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-sky-100/80 transition hover:bg-white/10"
                    >
                      <User size={19} />
                      الملف الشخصي
                    </Link>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-right text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
                    >
                      <LogOut size={19} />
                      تسجيل الخروج
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      تسجيل الدخول
                    </Link>

                    <Link
                      href="/register"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-400"
                    >
                      إنشاء حساب
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}