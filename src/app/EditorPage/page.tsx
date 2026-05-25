"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import type { Post } from "@/types";

export default function EditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "published" | "all">("pending");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.replace("/login"); return; }
    const roles = session.user.roles ?? [];
    if (!roles.some((r) => ["editor", "admin"].includes(r))) router.replace("/");
  }, [session, status, router]);

  useEffect(() => {
    const statusParam = filter === "all" ? "" : `&status=${filter}`;
    fetch(`/api/posts?limit=50${statusParam}`)
      .then((r) => r.json())
      .then((d: { posts?: Post[] }) => { setPosts(d.posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  async function updateStatus(postId: string, newStatus: string, reason?: string) {
    setProcessing(true);
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, rejectionReason: reason ?? "" }),
    });
    setProcessing(false);
    if (res.ok) {
      toast.success(newStatus === "published" ? "تم النشر بنجاح" : "تم الرفض");
      setPosts((p) => p.filter((x) => x.id !== postId));
      setSelectedPost(null);
      setRejectionReason("");
    } else {
      toast.error("حدث خطأ");
    }
  }

  const statusColor: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", published: "bg-green-100 text-green-700", draft: "bg-slate-100 text-slate-600", rejected: "bg-red-100 text-red-600" };
  const statusLabel: Record<string, string> = { pending: "قيد المراجعة", published: "منشور", draft: "مسودة", rejected: "مرفوض" };

  if (status === "loading") return <div className="min-h-screen bg-slate-50"><Navbar /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">لوحة المحرر</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["pending", "published", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f ? "bg-sky-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-sky-300"}`}>
              {f === "pending" ? "تنتظر المراجعة" : f === "published" ? "المنشورة" : "الكل"}
            </button>
          ))}
        </div>

        {/* Post detail modal */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">{selectedPost.title}</h2>
                <button onClick={() => setSelectedPost(null)} className="text-slate-400">✕</button>
              </div>
              <p className="text-sm text-slate-500 mb-4">بقلم: {selectedPost.authorName} | {selectedPost.category}</p>
              <div className="prose max-w-none border rounded-lg p-4 mb-6 max-h-80 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: selectedPost.content }} />

              {selectedPost.status === "pending" && (
                <div className="space-y-3">
                  <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="سبب الرفض (اختياري)" rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                  <div className="flex gap-3">
                    <button onClick={() => updateStatus(selectedPost.id, "published")} disabled={processing}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-60">
                      ✓ نشر
                    </button>
                    <button onClick={() => updateStatus(selectedPost.id, "rejected", rejectionReason)} disabled={processing}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium disabled:opacity-60">
                      ✕ رفض
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-400">جاري التحميل...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">لا توجد مقالات</div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between gap-4 hover:border-sky-200 transition cursor-pointer"
                onClick={() => setSelectedPost(post)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[post.status]}`}>
                      {statusLabel[post.status]}
                    </span>
                    <span className="text-xs text-slate-400">{post.category}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 truncate">{post.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">بقلم: {post.authorName}</p>
                </div>
                <span className="text-sky-600 text-sm shrink-0">عرض ←</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
