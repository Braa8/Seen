"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { db, storage } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LoadingPage from "./LoadingPage";

// Tiptap
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

// React Icons
import { FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaListUl, FaListOl } from "react-icons/fa";
import Image from "next/image";

const DRAFT_TTL_MS = 60 * 60 * 1000;

const WRITER_CATEGORIES = [
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
  "قانون",
];

type Props = {
  onPublished?: (postId: string) => void;
};

export default function WriterDashboard({ onPublished }: Props) {
  const { data: session } = useSession();
  const draftLoadedRef = useRef(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("تقنية");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editorContent, setEditorContent] = useState("");

  const storageKey = useMemo(
    () => `writer-draft:${session?.user?.id ?? "guest"}`,
    [session?.user?.id]
  );
  const userName = session?.user?.name || session?.user?.email || "";
  const userEmail = session?.user?.email || "";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "ابدأ بالكتابة هنا..." }),
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

  useEffect(() => {
    if (!editor || draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        timestamp: number;
        data?: {
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
      setTitle(saved.data.title ?? "");
      setExcerpt(saved.data.excerpt ?? "");
      const savedCategory = saved.data.category;
      if (savedCategory && WRITER_CATEGORIES.includes(savedCategory)) {
        setCategory(savedCategory);
      }
      const restoredImage = saved.data.imageUrl ?? "";
      if (restoredImage && !restoredImage.startsWith("blob:")) {
        setImageUrl(restoredImage);
      }
      const restoredContent = saved.data.content ?? "";
      if (restoredContent) {
        editor.commands.setContent(restoredContent);
        setEditorContent(restoredContent);
      }
    } catch (error) {
      console.error("Failed to restore writer draft", error);
    }
  }, [editor, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasData =
      title.trim() ||
      excerpt.trim() ||
      (editorContent && editorContent !== "<p></p>") ||
      imageUrl;
    const payload = {
      timestamp: Date.now(),
      data: {
        title,
        excerpt,
        category,
        imageUrl: imageUrl.startsWith("blob:") ? "" : imageUrl,
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
  }, [title, excerpt, category, imageUrl, editorContent, storageKey]);

  if (pageLoading) {
    return <LoadingPage />;
  }

  const canPublish =
    Boolean(session?.user?.id) &&
    title.trim().length > 0 &&
    (editor?.getText()?.trim().length ?? 0) > 0;

  // Functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!validTypes.includes(file.type)) {
      setMessage("❌ نوع الملف غير مدعوم. يرجى رفع ملف PDF أو Word أو TXT");
      return;
    }

    setUploading(true);
    setMessage("جارٍ معالجة الملف...");

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? "";

      if (file.type === "text/plain" || extension === "txt") {
        const textContent = await file.text();
        editor?.commands.setContent(`<p>${textContent.replace(/\n/g, "</p><p>")}</p>`);
        setMessage("✅ تم إدراج المحتوى النصي بنجاح!");
        return;
      }

      if (extension === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth/mammoth.browser");
        const { value } = await mammoth.convertToHtml({ arrayBuffer });
        const html = value?.trim() ? value : "<p></p>";
        editor?.commands.setContent(html);
        setMessage("✅ تم استيراد محتوى ملف Word بنجاح!");
        return;
      }

      if (extension === "pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist/build/pdf");
        const pdfWorker = await import("pdfjs-dist/build/pdf.worker.entry");
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = "";
        const maxPages = Math.min(pdf.numPages, 10);
        for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();
          const textItems = textContent.items as unknown as Array<{ str?: string }>;
          const pageText = textItems
            .map((item) => item.str ?? "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (pageText) {
            extractedText += pageText + "\n";
          }
        }
        const html = extractedText
          .split(/\n+/)
          .filter((paragraph) => paragraph.trim().length > 0)
          .map((paragraph) => `<p>${paragraph.trim()}</p>`)
          .join("");
        editor?.commands.setContent(html || `<p>${file.name}</p>`);
        setMessage("✅ تم استخراج محتوى ملف PDF (أول 10 صفحات). يرجى مراجعة التنسيق.");
        return;
      }

      if (extension === "doc") {
        const placeholder = `<p>تم رفع الملف <strong>${file.name}</strong>. صيغة DOC قديمة؛ يُنصح بتحويلها إلى DOCX ثم إعادة الرفع لتحسين النتيجة.</p>`;
        editor?.commands.setContent(placeholder);
        setMessage("⚠️ تم رفع ملف DOC. يُفضل تحويله إلى DOCX للحصول على استيراد أدق.");
        return;
      }

      setMessage("❌ نوع الملف غير مدعوم. يرجى رفع ملف TXT أو PDF أو Word.");
    } catch (error: unknown) {
      console.error(error);
      setMessage("❌ فشل في قراءة الملف");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!session?.user?.id) {
      setMessage("❌ يرجى تسجيل الدخول أولاً");
      return null;
    }
    
    try {
      setUploadingImage(true);
      setMessage("جاري رفع الصورة...");
      
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        throw new Error('الرجاء رفع ملف صورة صالح (JPG, PNG, GIF)');
      }
      
      // التحقق من حجم الملف (5 ميجابايت كحد أقصى)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت');
      }
      
      // إنشاء اسم فريد للملف
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const storagePath = `post-images/${session.user.id}/${fileName}`;
      
      // رفع الملف
      const storageRef = ref(storage, storagePath);
      
      try {
        // رفع الملف أولاً
        await uploadBytes(storageRef, file);
        
        // ثم الحصول على رابط التحميل
        const downloadURL = await getDownloadURL(storageRef);
        setMessage("✅ تم رفع الصورة بنجاح");
        return downloadURL;
      } catch (error) {
        console.error("حدث خطأ أثناء رفع الملف:", error);
        throw error; // إعادة رمي الخطأ للتعامل معه في catch الخارجي
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage("فشل رفع الصورة: " + (error instanceof Error ? error.message : 'حدث خطأ غير معروف'));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePublish = async () => {
    if (!editor || !session?.user?.id) {
      setMessage("خطأ: لم يتم العثور على بيانات المستخدم");
      return;
    }

    setLoading(true);
    setMessage("جاري نشر المنشور...");

    try {
      // Upload image if a new one was selected
      let uploadedImageUrl = imageUrl;
      if (imageFile) {
        setUploadingImage(true);
        try {
          const url = await handleImageUpload(imageFile);
          if (!url) {
            throw new Error("فشل رفع الصورة: لم يتم الحصول على رابط صالح");
          }
          uploadedImageUrl = url;
        } catch (error) {
          console.error('Error in image upload:', error);
          setMessage("حدث خطأ أثناء رفع الصورة");
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Validate required fields
      if (!title.trim()) {
        throw new Error("العنوان مطلوب");
      }

      const content = editor.getHTML();
      if (!content || content === '<p></p>') {
        throw new Error("محتوى المنشور مطلوب");
      }

      // Create the post data
      const postData = {
        authorId: session.user.id,
        authorEmail: userEmail,
        authorName: userName,
        title: title.trim(),
        excerpt: excerpt.trim() || editor.getText().substring(0, 150) + "...",
        content: content,
        category,
        image: uploadedImageUrl || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "draft"
      };

      // Add the post to Firestore
      const docRef = await addDoc(collection(db, "posts"), postData);

      // Reset form
      setMessage("تم حفظ المسودة بنجاح 📝 - سيتم مراجعتها من قبل المحرر");
      setTitle("");
      setExcerpt("");
      setCategory("تقنية");
      setImageUrl("");
      setImageFile(null);
      editor.commands.setContent("");
      setEditorContent("");
      
      // Clear draft from local storage
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
      
      // Notify parent component if needed
      onPublished?.(docRef.id);
    } catch (error) {
      console.error(error);
      setMessage("فشل الحفظ. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <p>جاري تحميل بيانات المستخدم...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">✍️ لوحة الكاتب</h1>
          <p className="text-gray-600">مرحباً {userName}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">إنشاء منشور جديد</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">عنوان المقال *</label>
            <input
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder=" أدخل عنوان المقال (حقل مطلوب) "
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المقتطف (اختياري)</label>
            <textarea
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ملخص قصير للمقال (سيتم إنشاؤه تلقائياً إذا تركته فارغاً)"
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">القسم *</label>
            <select
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {WRITER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">صورة المقال (اختياري)</label>
            <input
              placeholder="اختر صورة للمقال"
              type="file"
              accept="image/*"
              className="w-full border border-black p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  // Create a blob URL for preview
                  const blobUrl = URL.createObjectURL(file);
                  setImageUrl(blobUrl);
                  
                  // Clean up the blob URL when component unmounts or when a new image is selected
                  return () => {
                    URL.revokeObjectURL(blobUrl);
                  };
                } else {
                  setImageUrl('');
                  setImageFile(null);
                }
              }}
            />
            {uploadingImage && <p className="text-sm text-blue-600 mt-2">جارٍ رفع الصورة...</p>}
            {imageUrl && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">معاينة الصورة:</p>
                <div className="relative w-full h-48 rounded-lg border border-gray-300 overflow-hidden bg-gray-100">
                  <div className="w-full h-full relative">
                    <Image
                      src={imageUrl}
                      alt="معاينة الصورة"
                      fill
                      className="object-cover"
                      onError={(event) => {
                        const target = event.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.image-error-placeholder')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'absolute inset-0 flex items-center justify-center bg-gray-100';
                          errorDiv.innerHTML = `
                            <div class="text-center p-2">
                              <span class="text-gray-400 text-sm">تعذر تحميل الصورة</span>
                            </div>
                          `;
                          parent.appendChild(errorDiv);
                        }
                      }}
                      onLoad={() => {
                        // Don't revoke the URL here as we need it for the preview
                      }}
                    />
                  </div>
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                      <div className="w-10 h-10 border-4 border-white border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">أدوات التنسيق</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaBold />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaItalic />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaUnderline />
              </button>
              <button
                onClick={() => {
                  const url = prompt("أدخل رابط:");
                  if (url) editor?.chain().focus().setLink({ href: url }).run();
                }}
                className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaLink />
              </button>
              <button
                onClick={() => {
                  const url = prompt("أدخل رابط الصورة:");
                  if (url) editor?.chain().focus().setImage({ src: url }).run();
                }}
                className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaImage />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaListUl />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className="border border-gray-300 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaListOl />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">محتوى المقال *</label>
              <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold flex items-center gap-2">
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                📄 {uploading ? "جارٍ الرفع..." : "رفع ملف"}
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-xs text-yellow-800">
              💡 <strong>نصيحة:</strong> يمكنك رفع ملف نصي أو Word أو PDF لإدراج المحتوى تلقائياً، أو الكتابة مباشرة في المحرر أدناه.
            </div>

            <div className="border border-gray-300 rounded-lg p-4 min-h-[300px] focus-within:ring-2 focus-within:ring-blue-500">
              <EditorContent editor={editor} />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>ملاحظة:</strong> سيتم حفظ المقال كمسودة. سيقوم المحرر بمراجعته وتحديد موعد النشر.
            </p>
          </div>

          <button
            disabled={!canPublish || loading}
            onClick={handlePublish}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:cursor-pointer hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "جارٍ الحفظ..." : "حفظ كمسودة"}
          </button>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.includes("✅") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
