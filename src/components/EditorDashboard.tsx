
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { db } from "../lib/firebase";
import LoadingPage from "./LoadingPage";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaListUl, FaListOl } from "react-icons/fa";
import Image from "next/image";

const DRAFT_TTL_MS = 60 * 60 * 1000;

const EDITOR_CATEGORIES = [
  "تقنية",
  "سياسة",
  "تصميم",
  "أعمال",
  "رياضة",
  "أخبار",
  "اقتصاد",
  "صحة",
  "تعليم",
  "رأي",
  "التحقيقات الاستقصائية",
  "أسلوب حياة",
];

type PostData = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  status: string;
  category: string;
  authorName?: string;
  authorEmail?: string;
  createdAt?: unknown;
};

export default function EditorDashboard() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editorContent, setEditorContent] = useState("");
  const draftLoadedRef = useRef(false);

  const storageKey = `editor-draft:${session?.user?.id ?? "guest"}`;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "محتوى المقال..." }),
      ImageExtension,
      Link,
    ],
    content: "",
    immediatelyRender: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      setEditorContent(editor.getHTML());
    };
    setEditorContent(editor.getHTML());
    editor.on("update", handleUpdate);
    return () => {
      if (editor) editor.off("update", handleUpdate);
    };
  }, [editor]);

  const postsQuery = useMemo(() => {
    return query(
      collection(db, "posts"),
      where("status", "in", ["draft", "published"]),
      orderBy("createdAt", "desc")
    );
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(postsQuery, (snap) => {
      const list: PostData[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || "بدون عنوان",
          excerpt: data.excerpt || "",
          content: data.content || "",
          status: data.status || "draft",
          category: data.category || "",
          authorName: data.authorName,
          authorEmail: data.authorEmail,
          createdAt: data.createdAt
        });
      });
      setPosts(list);
    });
    return () => unsub();
  }, [postsQuery]);

  useEffect(() => {
    if (!editor || draftLoadedRef.current) return;
    if (typeof window === "undefined") return;
    draftLoadedRef.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        timestamp: number;
        data?: {
          selectedPost?: PostData | null;
          title?: string;
          excerpt?: string;
          category?: string;
          imageUrl?: string;
          content?: string;
        };
      };
      if (!saved?.data) return;
      if (Date.now() - saved.timestamp > DRAFT_TTL_MS) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      if (saved.data.selectedPost) {
        setSelectedPost(saved.data.selectedPost);
      }
      if (saved.data.title) setEditTitle(saved.data.title);
      if (saved.data.excerpt) setEditExcerpt(saved.data.excerpt);
      if (saved.data.category && EDITOR_CATEGORIES.includes(saved.data.category)) {
        setEditCategory(saved.data.category);
      }
      const restoredImage = saved.data.imageUrl ?? "";
      if (restoredImage && !restoredImage.startsWith("blob:")) {
        setEditImageUrl(restoredImage);
      }
      if (saved.data.content) {
        editor.commands.setContent(saved.data.content);
        setEditorContent(saved.data.content);
      }
    } catch (error) {
      console.error("Failed to restore editor draft", error);
    }
  }, [editor, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedPost) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    const hasData =
      editTitle.trim() ||
      editExcerpt.trim() ||
      (editorContent && editorContent !== "<p></p>") ||
      editImageUrl;
    const payload = {
      timestamp: Date.now(),
      data: {
        selectedPost,
        title: editTitle,
        excerpt: editExcerpt,
        category: editCategory,
        imageUrl: editImageUrl.startsWith("blob:") ? "" : editImageUrl,
        content: editorContent,
      },
    };
    const timeout = window.setTimeout(() => {
      if (!hasData) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [selectedPost, editTitle, editExcerpt, editCategory, editImageUrl, editorContent, storageKey]);

  if (pageLoading) {
    return <LoadingPage />;
  }

  const canModerate = Array.isArray(session?.user?.roles) && (session!.user.roles.includes("editor") || session!.user.roles.includes("admin"));

  // Functions
  const loadPostForEdit = async (postId: string) => {
    try {
      const docSnap = await getDoc(doc(db, "posts", postId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const post: PostData = {
          id: docSnap.id,
          title: data.title || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          status: data.status || "draft",
          category: data.category || "",
          authorName: data.authorName,
          authorEmail: data.authorEmail
        };
        setSelectedPost(post);
        setEditTitle(post.title);
        setEditExcerpt(post.excerpt);
        setEditCategory(post.category);
        setEditImageUrl(data.image || "");
        editor?.commands.setContent(post.content);
        setEditorContent(post.content);
      }
    } catch {
      setMessage("فشل تحميل المنشور");
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!session?.user?.id) return null;
    try {
      setUploadingImage(true);
      const timestamp = Date.now();
      const imageRef = ref(storage, `post-images/${session.user.id}/${timestamp}_${file.name}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      return url;
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage("فشل رفع الصورة");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const saveEdits = async () => {
    if (!selectedPost || !editor) return;
    setLoading(true);
    try {
      let uploadedImageUrl = editImageUrl;
      if (editImageFile) {
        const url = await handleImageUpload(editImageFile);
        if (url) uploadedImageUrl = url;
      }

      await updateDoc(doc(db, "posts", selectedPost.id), {
        title: editTitle,
        excerpt: editExcerpt,
        category: editCategory,
        image: uploadedImageUrl || undefined,
        content: editor.getHTML(),
        updatedAt: serverTimestamp()
      });
      setMessage("تم حفظ التعديلات ✅");
      setSelectedPost(null);
      setEditImageFile(null);
      editor.commands.setContent("");
      setEditorContent("");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      setMessage("فشل حفظ التعديلات");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (postId: string, toStatus: "draft" | "published") => {
    if (!canModerate) return;
    try {
      await updateDoc(doc(db, "posts", postId), { status: toStatus, updatedAt: serverTimestamp() });
      setMessage(`تم تغيير الحالة إلى ${toStatus === 'published' ? 'منشور' : 'مسودة'} ✅`);
    } catch {
      setMessage("تعذر تغيير الحالة");
    }
  };

  const remove = async (postId: string) => {
    if (!canModerate || !confirm("هل أنت متأكد من حذف هذا المنشور؟")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      setMessage("تم الحذف ✅");
    } catch {
      setMessage("تعذر الحذف");
    }
  };

  if (!canModerate) return <p className="text-center py-20">لا تملك صلاحيات المحرر.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📝 لوحة المحرر</h1>
          <p className="text-gray-600">مراجعة وإدارة المنشورات</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {message}
          </div>
        )}

        {selectedPost && (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">تعديل المنشور</h2>
              <button
                onClick={() => {
                  setSelectedPost(null);
                  editor?.commands.setContent("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ إغلاق
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
              <input
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المقتطف</label>
              <textarea
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                value={editExcerpt}
                onChange={(e) => setEditExcerpt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
              <select
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              >
                {EDITOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">صورة المقال (اختياري)</label>
              <input
                type="file"
                accept="image/*"
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditImageFile(file);
                    setEditImageUrl(URL.createObjectURL(file));
                  }
                }}
              />
              {uploadingImage && <p className="text-sm text-blue-600 mt-2">جارٍ رفع الصورة...</p>}
              {editImageUrl && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">معاينة الصورة:</p>
                  <Image
                    src={editImageUrl}
                    alt="معاينة"
                    width={800}
                    height={480}
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">أدوات التنسيق</label>
              <div className="flex gap-2 mb-3 flex-wrap">
                <button onClick={() => editor?.chain().focus().toggleBold().run()} className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100"><FaBold /></button>
                <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100"><FaItalic /></button>
                <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100"><FaUnderline /></button>
                <button onClick={() => {
                  const url = prompt("أدخل رابط:");
                  if (url) editor?.chain().focus().setLink({ href: url }).run();
                }} className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100"><FaLink /></button>
                <button onClick={() => {
                  const url = prompt("أدخل رابط الصورة:");
                  if (url) editor?.chain().focus().setImage({ src: url }).run();
                }} className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100"><FaImage /></button>
                <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100"><FaListUl /></button>
                <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100"><FaListOl /></button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المحتوى</label>
              <div className="border border-gray-300 rounded-lg p-4 min-h-[300px]">
                <EditorContent editor={editor} />
              </div>
            </div>

            <button
              onClick={saveEdits}
              disabled={loading}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:bg-gray-400"
            >
              {loading ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">جميع المنشورات</h2>

          <div className="flex gap-3 mb-6">
            <button className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold">
              المسودات ({posts.filter(p => p.status === 'draft').length})
            </button>
            <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
              المنشورة ({posts.filter(p => p.status === 'published').length})
            </button>
          </div>

          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-800">{p.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status === 'published' ? 'منشور' : 'مسودة'}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {p.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{p.excerpt}</p>
                    <p className="text-xs text-gray-500">بواسطة: {p.authorName || p.authorEmail || "غير معروف"}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => loadPostForEdit(p.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                    >
                      ✏️ تعديل
                    </button>
                    {p.status === "published" ? (
                      <button
                        onClick={() => setStatus(p.id, "draft")}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-semibold"
                      >
                        📝 إلغاء النشر
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(p.id, "published")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                      >
                        ✅ نشر
                      </button>
                    )}
                    <button
                      onClick={() => remove(p.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>لا توجد منشورات بعد</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


