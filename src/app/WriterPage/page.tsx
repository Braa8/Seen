"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import type { Post } from "@/types";

const CATEGORIES = ["رأي", "تقنية", "سياسة", "اقتصاد", "رياضة", "ثقافة", "أخبار", "تحقيقات", "تعليم"];

export default function WriterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [featuredImage, setFeaturedImage] = useState("");
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "ابدأ الكتابة هنا..." }),
    ],
    content: "",
    editorProps: {
      attributes: { class: "prose max-w-none min-h-64 focus:outline-none p-4" },
    },
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.replace("/login"); return; }
    const roles = session.user.roles ?? [];
    if (!roles.some((r) => ["writer", "editor", "admin"].includes(r))) {
      router.replace("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/posts?authorId=${session.user.id}&limit=50`)
      .then((r) => r.json())
      .then((d: { posts?: Post[] }) => { setPosts(d.posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  function openNewPost() {
    setEditingPost(null);
    setTitle(""); setExcerpt(""); setCategory(CATEGORIES[0]); setFeaturedImage("");
    editor?.commands.setContent("");
    setShowEditor(true);
  }

  function openEditPost(post: Post) {
    setEditingPost(post);
    setTitle(post.title); setExcerpt(post.excerpt); setCategory(post.category);
    setFeaturedImage(post.featuredImage);
    editor?.commands.setContent(post.content);
    setShowEditor(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json() as { file?: { url: string } };
    if (d.file?.url) setFeaturedImage(d.file.url);
  }

  async function handleSave(postStatus: "draft" | "pending") {
    if (!title.trim() || !editor?.getText().trim()) {
      toast.error("العنوان والمحتوى مطلوبان"); return;
    }
    setSaving(true);
    const payload = {
      title, excerpt: excerpt || editor.getText().substring(0, 150) + "...",
      content: editor.getHTML(), category, featuredImage, status: postStatus,
    };
    try {
      const url = editingPost ? `/api/posts/${editingPost.id}` : "/api/posts";
      const method = editingPost ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error);
      toast.success(postStatus === "pending" ? "تم إرسال المقال للمراجعة" : "تم الحفظ كمسودة");
      setShowEditor(false);
      const newRes = await fetch(`/api/posts?authorId=${session?.user?.id}&limit=50`);
      const nd = await newRes.json() as { posts?: Post[] };
      setPosts(nd.posts ?? []);
    } catch (err) {
      toast.error((err as Error).message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("هل تريد حذف هذا المقال؟")) return;
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((p) => p.filter((x) => x.id !== postId));
      toast.success("تم حذف المقال");
    }
  }

  const statusLabel: Record<string, string> = { draft: "مسودة", pending: "قيد المراجعة", published: "منشور", rejected: "مرفوض" };
  const statusColor: Record<string, string> = { draft: "bg-slate-100 text-slate-600", pending: "bg-yellow-100 text-yellow-700", published: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600" };

  if (status === "loading") return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex justify-center py-40">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-800">كتاباتي</h1>
          <button onClick={openNewPost} className="px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium">
            + مقال جديد
          </button>
        </div>

        {showEditor && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editingPost ? "تعديل المقال" : "مقال جديد"}</h2>
              <button onClick={() => setShowEditor(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المقال"
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-sky-500" />

              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="مقتطف قصير (اختياري)"
                rows={2} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />

              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>

              <div>
                <label className="text-sm text-slate-600 mb-1 block">صورة المقال (اختياري)</label>
                <input type="file" accept="image/*" onChange={handleImageUpload}
                  className="text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-sky-50 file:text-sky-700 file:cursor-pointer" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {featuredImage && <img src={featuredImage} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex gap-1 p-2 bg-slate-50 border-b border-slate-200 flex-wrap">
                  {[
                    { label: "B", action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold") },
                    { label: "I", action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic") },
                    { label: "H2", action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }) },
                    { label: "•", action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList") },
                  ].map((btn) => (
                    <button key={btn.label} onClick={btn.action}
                      className={`px-2 py-1 text-sm rounded transition ${btn.active ? "bg-sky-600 text-white" : "hover:bg-slate-200 text-slate-700"}`}>
                      {btn.label}
                    </button>
                  ))}
                </div>
                <EditorContent editor={editor} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => handleSave("draft")} disabled={saving}
                className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium disabled:opacity-60">
                حفظ مسودة
              </button>
              <button onClick={() => handleSave("pending")} disabled={saving}
                className="px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium disabled:opacity-60">
                {saving ? "جاري الإرسال..." : "إرسال للمراجعة"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-400">جاري التحميل...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-xl mb-2">لا توجد مقالات بعد</p>
            <p className="text-sm">أضف مقالاً</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[post.status]}`}>
                      {statusLabel[post.status]}
                    </span>
                    <span className="text-xs text-slate-400">{post.category}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 truncate">{post.title}</h3>
                  {post.status === "rejected" && post.rejectionReason && (
                    <p className="text-xs text-red-500 mt-1">السبب: {post.rejectionReason}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {(post.status === "draft" || post.status === "rejected") && (
                    <button onClick={() => openEditPost(post)} className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
                      تعديل
                    </button>
                  )}
                  <button onClick={() => handleDelete(post.id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}