"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
}

const ALL_ROLES = ["viewer", "writer", "editor", "admin"];
const ROLE_LABELS: Record<string, string> = { viewer: "قارئ", writer: "كاتب", editor: "محرر", admin: "أدمن" };
const ROLE_COLORS: Record<string, string> = { viewer: "bg-slate-100 text-slate-600", writer: "bg-blue-100 text-blue-700", editor: "bg-purple-100 text-purple-700", admin: "bg-red-100 text-red-700" };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.replace("/login"); return; }
    if (!session.user.roles?.includes("admin")) router.replace("/");
  }, [session, status, router]);

  useEffect(() => {
    if (!session?.user.roles?.includes("admin")) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: { users?: User[] }) => { setUsers(d.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  async function updateRoles(userId: string, roles: string[]) {
    setSaving(userId);
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roles }),
    });
    setSaving(null);
    if (res.ok) {
      setUsers((u) => u.map((x) => x.id === userId ? { ...x, roles } : x));
      toast.success("تم تحديث الأدوار");
    } else {
      toast.error("حدث خطأ");
    }
  }

  function toggleRole(user: User, role: string) {
    if (user.id === session?.user.id) { toast.error("لا يمكن تعديل دورك الخاص"); return; }
    const current = user.roles;
    const updated = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    if (updated.length === 0) updated.push("viewer");
    updateRoles(user.id, updated);
  }

  if (status === "loading") return <div className="min-h-screen bg-slate-50"><Navbar /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">لوحة الإدارة</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">المستخدمون ({users.length})</h2>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-400">جاري التحميل...</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {users.map((user) => (
                <div key={user.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{user.displayName || user.email}</p>
                    <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    {user.id === session?.user.id && (
                      <span className="text-xs text-sky-600 font-medium">(أنت)</span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {ALL_ROLES.map((role) => (
                      <button key={role} onClick={() => toggleRole(user, role)}
                        disabled={saving === user.id || user.id === session?.user.id}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border-2 transition disabled:opacity-50 ${
                          user.roles.includes(role)
                            ? `${ROLE_COLORS[role]} border-current`
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                        }`}>
                        {saving === user.id ? "..." : ROLE_LABELS[role]}
                      </button>
                    ))}
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
