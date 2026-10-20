"use client";

import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
} from "react";
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

const CATEGORIES = [
  "رأي",
  "تقنية",
  "سياسة",
  "اقتصاد",
  "رياضة",
  "ثقافة",
  "أخبار",
  "تحقيقات",
  "تعليم",
];

type UploadResponse = {
  error?: string;
  file?: {
    url: string;
  };
};

type ExtractResponse = {
  error?: string;
  text?: string;
  fileName?: string;
  truncated?: boolean;
  success?: boolean;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n[ \t]*\n+/)
    .filter((paragraph) => paragraph.trim().length > 0)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

export default function WriterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [featuredImage, setFeaturedImage] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [extractingDocument, setExtractingDocument] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({
        inline: false,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder:
          "ابدأ كتابة مقالك هنا... يمكنك إدراج الصور بين الفقرات.",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-64 focus:outline-none p-4 text-right",
        dir: "rtl",
      },
    },
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/login");
      return;
    }

    const roles = session.user.roles ?? [];

    if (!roles.some((role) =>
      ["writer", "editor", "admin"].includes(role)
    )) {
      router.replace("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;

    fetch(`/api/posts?authorId=${session.user.id}&limit=50`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل المقالات");
        }

        return response.json() as Promise<{ posts?: Post[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setPosts(data.posts ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("تعذر تحميل قائمة المقالات");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  function openNewPost() {
    setEditingPost(null);
    setTitle("");
    setExcerpt("");
    setCategory(CATEGORIES[0]);
    setFeaturedImage("");
    editor?.commands.setContent("");
    setShowEditor(true);
  }

  function openEditPost(post: Post) {
    setEditingPost(post);
    setTitle(post.title);
    setExcerpt(post.excerpt);
    setCategory(post.category);
    setFeaturedImage(post.featuredImage);
    editor?.commands.setContent(post.content);
    setShowEditor(true);
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح");
      input.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 4MB");
      input.value = "";
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data =
        (await response.json()) as UploadResponse;

      if (!response.ok || !data.file?.url) {
        throw new Error(
          data.error || "تعذر رفع الصورة"
        );
      }

      if (!editor) {
        throw new Error("محرر المقال غير جاهز");
      }

      const imageUrl = data.file.url;

      // إدراج الصورة عند موضع المؤشر داخل المقال.
      const inserted = editor
        .chain()
        .focus()
        .setImage({
          src: imageUrl,
          alt: file.name,
          title: file.name,
        })
        .run();

      if (!inserted) {
        throw new Error("تعذر إدراج الصورة داخل المقال");
      }

      toast.success("تم رفع الصورة وإدراجها داخل المقال");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء رفع الصورة"
      );
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  }

  async function handleDocumentImport(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (extension !== "docx" && extension !== "pdf") {
      toast.error("الصيغ المدعومة هي Word DOCX وPDF");
      input.value = "";
      return;
    }

    if (file.size === 0) {
      toast.error("الملف فارغ");
      input.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("حجم المستند يجب ألا يتجاوز 4MB");
      input.value = "";
      return;
    }

    if (!editor) {
      toast.error("محرر المقال غير جاهز");
      input.value = "";
      return;
    }

    // نحتفظ بمكان المؤشر قبل بدء استخراج الملف.
    const previousSelection = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };

    const currentText = editor.getText().trim();

    let importMode: "append" | "replace" = "append";

    if (currentText.length > 0) {
      const shouldReplace = window.confirm(
        "اضغط «موافق» لاستبدال محتوى المقال بالنص المستورد.\n" +
        "اضغط «إلغاء» لإضافة النص المستورد إلى المحتوى الحالي."
      );

      importMode = shouldReplace ? "replace" : "append";
    }

    setExtractingDocument(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/documents/extract",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        (await response.json()) as ExtractResponse;

      if (!response.ok || !data.text) {
        throw new Error(
          data.error || "تعذر استخراج النص من المستند"
        );
      }

      const html = textToHtml(data.text);

      if (!html) {
        throw new Error(
          "لم يتم العثور على نص صالح للإدراج"
        );
      }

      if (importMode === "replace") {
        editor.commands.setContent(html);
        editor.commands.focus("end");
      } else {
        const maxPosition = editor.state.doc.content.size;

        const safeFrom = Math.min(
          previousSelection.from,
          maxPosition
        );

        const safeTo = Math.min(
          previousSelection.to,
          maxPosition
        );

        editor
          .chain()
          .focus()
          .insertContentAt(
            {
              from: Math.min(safeFrom, safeTo),
              to: Math.max(safeFrom, safeTo),
            },
            html
          )
          .run();
      }

      if (data.truncated) {
        toast.success(
          "تم استيراد النص، لكن جرى اختصاره بسبب طول المستند"
        );
      } else {
        toast.success("تم استيراد النص إلى محرر المقال");
      }

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء استيراد المستند"
      );
    } finally {
      setExtractingDocument(false);
      input.value = "";
    }
  }

  async function handleSave(
    postStatus: "draft" | "pending"
  ) {
    if (!title.trim() || !editor?.getText().trim()) {
      toast.error("العنوان والمحتوى مطلوبان");
      return;
    }

    setSaving(true);

    const payload = {
      title: title.trim(),
      excerpt:
        excerpt.trim() ||
        editor.getText().substring(0, 150) + "...",
      content: editor.getHTML(),
      category,
      featuredImage,
      status: postStatus,
    };

    try {
      const url = editingPost
        ? `/api/posts/${editingPost.id}`
        : "/api/posts";

      const method = editingPost ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data =
        (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          data.error || "تعذر حفظ المقال"
        );
      }

      toast.success(
        postStatus === "pending"
          ? "تم إرسال المقال للمراجعة"
          : "تم الحفظ كمسودة"
      );

      setShowEditor(false);

      const postsResponse = await fetch(
        `/api/posts?authorId=${session?.user?.id}&limit=50`
      );

      if (postsResponse.ok) {
        const postsData =
          (await postsResponse.json()) as {
            posts?: Post[];
          };

        setPosts(postsData.posts ?? []);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حفظ المقال"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(postId: string) {
    if (!window.confirm("هل تريد حذف هذا المقال؟")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/posts/${postId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data =
          (await response.json()) as {
            error?: string;
          };

        throw new Error(
          data.error || "تعذر حذف المقال"
        );
      }

      setPosts((current) =>
        current.filter((post) => post.id !== postId)
      );

      toast.success("تم حذف المقال");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حذف المقال"
      );
    }
  }

  const statusLabel: Record<string, string> = {
    draft: "مسودة",
    pending: "قيد المراجعة",
    published: "منشور",
    rejected: "مرفوض",
  };

  const statusColor: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    pending: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center py-40">
          <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-slate-800">
            كتاباتي
          </h1>

          <button
            type="button"
            onClick={openNewPost}
            className="px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium"
          >
            + مقال جديد
          </button>
        </div>

        {showEditor && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold">
                {editingPost ? "تعديل المقال" : "مقال جديد"}
              </h2>

              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
                aria-label="إغلاق المحرر"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="عنوان المقال"
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <textarea
                value={excerpt}
                onChange={(event) =>
                  setExcerpt(event.target.value)
                }
                placeholder="مقتطف قصير (اختياري)"
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              {/* الصورة الرئيسية للمقال */}
              <div className="border border-slate-200 rounded-xl p-4">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  الصورة الرئيسية للمقال (اختياري)
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];

                    if (!file) return;

                    if (file.size > 4 * 1024 * 1024) {
                      toast.error(
                        "حجم الصورة يجب ألا يتجاوز 4MB"
                      );
                      input.value = "";
                      return;
                    }

                    setUploadingImage(true);

                    try {
                      const formData = new FormData();
                      formData.append("file", file);

                      const response = await fetch(
                        "/api/upload",
                        {
                          method: "POST",
                          body: formData,
                        }
                      );

                      const data =
                        (await response.json()) as UploadResponse;

                      if (
                        !response.ok ||
                        !data.file?.url
                      ) {
                        throw new Error(
                          data.error ||
                            "تعذر رفع الصورة الرئيسية"
                        );
                      }

                      setFeaturedImage(data.file.url);
                      toast.success(
                        "تم رفع الصورة الرئيسية"
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "تعذر رفع الصورة"
                      );
                    } finally {
                      setUploadingImage(false);
                      input.value = "";
                    }
                  }}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 file:cursor-pointer"
                />

                {uploadingImage && (
                  <p className="mt-2 text-sm text-sky-600">
                    جاري رفع الصورة...
                  </p>
                )}

                {featuredImage && (
                  <div className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImage}
                      alt="معاينة الصورة الرئيسية"
                      className="h-32 max-w-full rounded-lg object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => setFeaturedImage("")}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      إزالة الصورة الرئيسية
                    </button>
                  </div>
                )}
              </div>

              {/* المحرر */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-3 space-y-3">
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-xs text-slate-500 ml-1">
                      تنسيق النص:
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        editor?.chain().focus().toggleBold().run()
                      }
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        editor?.isActive("bold")
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      disabled={!editor}
                    >
                      عريض B
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editor?.chain().focus().toggleItalic().run()
                      }
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        editor?.isActive("italic")
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      disabled={!editor}
                    >
                      مائل I
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .toggleHeading({ level: 2 })
                          .run()
                      }
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        editor?.isActive("heading", {
                          level: 2,
                        })
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      disabled={!editor}
                    >
                      عنوان فرعي
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .toggleBulletList()
                          .run()
                      }
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        editor?.isActive("bulletList")
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      disabled={!editor}
                    >
                      • قائمة
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .toggleOrderedList()
                          .run()
                      }
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        editor?.isActive("orderedList")
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      disabled={!editor}
                    >
                      1. قائمة مرقمة
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap items-center pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-500 ml-1">
                      إدراج محتوى:
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        imageInputRef.current?.click()
                      }
                      disabled={
                        uploadingImage || !editor
                      }
                      className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {uploadingImage
                        ? "جاري رفع الصورة..."
                        : "＋ إدراج صورة داخل المقال"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        documentInputRef.current?.click()
                      }
                      disabled={
                        extractingDocument || !editor
                      }
                      className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {extractingDocument
                        ? "جاري استخراج النص..."
                        : "⇧ استيراد Word / PDF"}
                    </button>

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="اختيار صورة لإدراجها داخل المقال"
                    />

                    <input
                      ref={documentInputRef}
                      type="file"
                      accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleDocumentImport}
                      className="hidden"
                      aria-label="اختيار مستند Word أو PDF"
                    />
                  </div>

                  <p className="text-xs text-slate-500 leading-6">
                    ضع المؤشر بين الفقرات ثم اضغط «إدراج صورة»
                    لوضعها في ذلك الموضع. استيراد المستند
                    يضيف النص عند موضع المؤشر، أو يسمح
                    باستبدال المحتوى الحالي.
                  </p>
                </div>

                <div className="bg-white">
                  <EditorContent editor={editor} />
                </div>
              </div>

              <div className="flex gap-3 flex-wrap pt-2">
                <button
                  type="button"
                  onClick={() => handleSave("draft")}
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium disabled:opacity-60"
                >
                  حفظ مسودة
                </button>

                <button
                  type="button"
                  onClick={() => handleSave("pending")}
                  disabled={saving}
                  className="px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium disabled:opacity-60"
                >
                  {saving
                    ? "جاري الإرسال..."
                    : "إرسال للمراجعة"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* قائمة المقالات */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            جاري التحميل...
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-xl mb-2">
              لا توجد مقالات بعد
            </p>
            <p className="text-sm">
              أضف مقالاً للبدء
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        statusColor[post.status] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {statusLabel[post.status] ??
                        post.status}
                    </span>

                    <span className="text-xs text-slate-400">
                      {post.category}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-800 truncate">
                    {post.title}
                  </h3>

                  {post.status === "rejected" &&
                    post.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1">
                        السبب: {post.rejectionReason}
                      </p>
                    )}
                </div>

                <div className="flex gap-2 shrink-0">
                  {(post.status === "draft" ||
                    post.status === "rejected") && (
                    <button
                      type="button"
                      onClick={() => openEditPost(post)}
                      className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                    >
                      تعديل
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  >
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}