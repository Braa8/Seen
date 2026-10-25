"use client";

import { useCallback, useEffect, useState } from "react";
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

interface UsersResponse {
  success?: boolean;
  users?: User[];
  error?: string;
}

interface UpdateResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

const ALL_ROLES = ["viewer", "writer", "editor", "admin"] as const;

type Role = (typeof ALL_ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  viewer: "قارئ",
  writer: "كاتب",
  editor: "محرر",
  admin: "مدير",
};

const ROLE_COLORS: Record<Role, string> = {
  viewer: "bg-slate-100 text-slate-600",
  writer: "bg-blue-100 text-blue-700",
  editor: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const isAdmin = session?.user?.roles?.includes("admin") ?? false;

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [session, status, isAdmin, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as UsersResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "تعذر جلب قائمة المستخدمين"
        );
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      console.error("Failed to load admin users:", error);

      const message =
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحميل المستخدمين";

      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) {
      return;
    }

    void loadUsers();
  }, [status, isAdmin, loadUsers]);

  async function updateRoles(userId: string, roles: Role[]) {
    if (saving !== null) {
      return;
    }

    if (userId === session?.user?.id) {
      toast.error("لا يمكنك تعديل أدوار حسابك الخاص");
      return;
    }

    setSaving(userId);

    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, roles }),
      });

      const data = (await response.json()) as UpdateResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "تعذر تحديث أدوار المستخدم"
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? { ...user, roles } : user
        )
      );

      toast.success(data.message || "تم تحديث الأدوار بنجاح");
    } catch (error) {
      console.error("Failed to update user roles:", error);

      const message =
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث الأدوار";

      toast.error(message);

      // قد يكون الطلب وصل إلى الخادم قبل انقطاع الاتصال.
      // نعيد تحميل البيانات لتجنب عرض أدوار قديمة.
      await loadUsers();
    } finally {
      setSaving(null);
    }
  }

  function toggleRole(user: User, role: Role) {
    if (saving !== null) {
      return;
    }

    if (user.id === session?.user?.id) {
      toast.error("لا يمكنك تعديل أدوار حسابك الخاص");
      return;
    }

    const currentRoles = user.roles.filter(
      (item): item is Role =>
        ALL_ROLES.includes(item as Role)
    );

    const updatedRoles = currentRoles.includes(role)
      ? currentRoles.filter((item) => item !== role)
      : [...currentRoles, role];

    if (updatedRoles.length === 0) {
      toast.error("يجب أن يمتلك المستخدم دوراً واحداً على الأقل");
      return;
    }

    void updateRoles(user.id, updatedRoles);
  }

  if (status === "loading" || !session || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50" dir="rtl">
        <Navbar />
        <div className="py-20 text-center text-slate-500">
          جاري التحقق من الصلاحيات...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              لوحة الإدارة
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              إدارة المستخدمين وتحديد صلاحياتهم.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading || saving !== null}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "جاري التحميل..." : "تحديث القائمة"}
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-700">
              المستخدمون ({users.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              جاري تحميل المستخدمين...
            </div>
          ) : loadError ? (
            <div className="p-8 text-center">
              <p className="mb-4 text-sm text-red-600">
                {loadError}
              </p>

              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              لا يوجد مستخدمون لعرضهم.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((user) => {
                const isCurrentUser = user.id === session.user.id;

                return (
                  <div
                    key={user.id}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">
                        {user.displayName || user.email || "مستخدم بلا اسم"}
                      </p>

                      <p className="truncate text-sm text-slate-500">
                        {user.email}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {isCurrentUser && (
                          <span className="text-xs font-medium text-sky-600">
                            (أنت)
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            user.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.isActive ? "نشط" : "معطل"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ALL_ROLES.map((role) => {
                        const hasRole = user.roles.includes(role);

                        return (
                          <button
                            key={role}
                            type="button"
                            aria-pressed={hasRole}
                            onClick={() => toggleRole(user, role)}
                            disabled={saving !== null || isCurrentUser}
                            className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              hasRole
                                ? `${ROLE_COLORS[role]} border-current`
                                : "border-slate-200 bg-white text-slate-400 hover:border-slate-400"
                            }`}
                          >
                            {saving === user.id
                              ? "جاري الحفظ..."
                              : ROLE_LABELS[role]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}