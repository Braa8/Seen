"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import type { Notification } from "@/types";

const ROLE_LABELS: Record<string, string> = { viewer: "قارئ", writer: "كاتب", editor: "محرر", admin: "أدمن" };
const ROLE_COLORS: Record<string, string> = { viewer: "bg-slate-100 text-slate-600", writer: "bg-blue-100 text-blue-700", editor: "bg-purple-100 text-purple-700", admin: "bg-red-100 text-red-700" };

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/login");
  }, [session, status, router]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d: { notifications?: Notification[] }) => {
        setNotifications(d.notifications ?? []);
        setLoadingNotifs(false);
      })
      .catch(() => setLoadingNotifs(false));
  }, [session]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  }

  async function clearRead() {
    await fetch("/api/notifications", { method: "DELETE" });
    setNotifications((n) => n.filter((x) => !x.read));
    toast.success("تم حذف الإشعارات المقروءة");
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (status === "loading" || !session) return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="flex justify-center py-40">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    </div>
  );

  const user = session.user;
  const roles = user.roles ?? ["viewer"];
  const initial = (user.name || user.email || "؟").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-sky-600 text-white rounded-full flex items-center justify-center text-2xl font-black">
              {initial}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{user.name ?? user.email?.split("@")[0]}</h1>
              <p className="text-slate-500 text-sm">{user.email}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {roles.map((r) => (
                  <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] ?? "bg-slate-100 text-slate-600"}`}>
                    {ROLE_LABELS[r] ?? r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex gap-3 flex-wrap">
            {roles.some((r) => ["writer", "editor", "admin"].includes(r)) && (
              <a href="/WriterPage" className="px-4 py-2 text-sm bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition font-medium">
                كتاباتي
              </a>
            )}
            {roles.some((r) => ["editor", "admin"].includes(r)) && (
              <a href="/EditorPage" className="px-4 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition font-medium">
                المحرر
              </a>
            )}
            {roles.includes("admin") && (
              <a href="/AdminPage" className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium">
                الإدارة
              </a>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-medium mr-auto"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">
              الإشعارات
              {unreadCount > 0 && (
                <span className="mr-2 text-xs bg-sky-600 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h2>
            {notifications.some((n) => n.read) && (
              <button onClick={clearRead} className="text-xs text-slate-400 hover:text-red-500 transition">
                حذف المقروءة
              </button>
            )}
          </div>

          {loadingNotifs ? (
            <div className="text-center py-10 text-slate-400 text-sm">جاري التحميل...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">لا توجد إشعارات</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markRead(notif.id)}
                  className={`p-4 cursor-pointer transition ${!notif.read ? "bg-sky-50 hover:bg-sky-100" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notif.read ? "bg-slate-200" : "bg-sky-500"}`} />
                    <div>
                      <p className={`text-sm font-medium ${notif.read ? "text-slate-500" : "text-slate-800"}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
