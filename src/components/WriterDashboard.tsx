"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaListUl, FaListOl } from "react-icons/fa";
import { db, storage } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import NextImage from "next/image";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("تقنية");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const storageKey = useMemo(
    () => `writer-draft:${session?.user?.id ?? "guest"}`,
    [session?.user?.id]
  );
  const userName = session?.user?.name || session?.user?.email || "";
  const userEmail = session?.user?.email || "";

  // Load draft from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedDraft = window.localStorage.getItem(storageKey);
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft);

          // Check if draft is still valid (not expired)
          if (Date.now() - draftData.timestamp < DRAFT_TTL_MS) {
            setTitle(draftData.title || "");
            setExcerpt(draftData.excerpt || "");
            setCategory(draftData.category || "تقنية");
            setImageUrl(draftData.imageUrl || "");
            setEditorContent(draftData.editorContent || "");
            setMessage("✅ تم تحميل المسودة المحفوظة");
          } else {
            // Clear expired draft
            window.localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }, [storageKey]);

  // Save draft to localStorage when content changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const draftData = {
        title,
        excerpt,
        category,
        imageUrl,
        editorContent,
        timestamp: Date.now()
      };

      window.localStorage.setItem(storageKey, JSON.stringify(draftData));
    }
  }, [title, excerpt, category, imageUrl, editorContent, storageKey]);

  // Initialize editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'اكتب مقالتك هنا...',
      }),
      ImageExtension,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: editorContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setEditorContent(html);
    },
  });

  const uploadImageToStorage = useCallback(async (file: File) => {
    if (!session?.user?.id) {
      setMessage(" ❌ يرجى تسجيل الدخول أولاً");
      return null;
    }
    
    try {
      setUploadingImage(true);
      setMessage("جاري رفع الصورة...");
      
      const storageRef = ref(storage, `posts/${session.user.id}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setMessage("✅ تم رفع الصورة بنجاح");
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage("❌ فشل رفع الصورة");
      return null;
    } finally {
      setUploadingImage(false);
    }
  }, [session?.user?.id]);

  const handleFileUpload = useCallback(async (file: File) => {
    const imageUrl = await uploadImageToStorage(file);
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl(imageUrl);
    }
  }, [editor, uploadImageToStorage]);

  // Configure dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const canPublish = useMemo(() => {
    return title.trim() && editor?.getText().trim();
  }, [title, editor]);

  const handlePublish = useCallback(async () => {
    if (!canPublish || !session?.user?.id) {
      setMessage("❌ يرجى إكمال البيانات المطلوبة");
      return;
    }

    try {
      setLoading(true);
      setMessage("جاري نشر المقال...");

      const postData = {
        authorId: session.user.id,
        authorEmail: userEmail,
        authorName: userName,
        title: title.trim(),
        excerpt: excerpt.trim() || editor?.getText().substring(0, 150) + "..." || "",
        content: editorContent,
        category,
        image: imageUrl || null,
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
      if (editor) {
        editor.commands.setContent("");
      }
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
  }, [canPublish, session?.user?.id, userEmail, userName, title, excerpt, editor, editorContent, category, imageUrl, storageKey, onPublished]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>جاري تحميل بيانات المستخدم...</p>
      </div>
    );
  }

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
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input {...getInputProps()} />
              {imageUrl ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <NextImage
                    src={imageUrl}
                    alt="معاينة الصورة"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <FaCloudUploadAlt className="text-white text-2xl" />
                    <span className="text-white mr-2">تغيير الصورة</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <FaCloudUploadAlt className="mx-auto text-3xl text-gray-400" />
                  <p className="text-sm text-gray-600">انقر لرفع صورة</p>
                  <p className="text-xs text-gray-400">JPEG, PNG, WEBP, GIF (الحد الأقصى: 5MB)</p>
                </div>
              )}
            </div>
            {uploadingImage && (
              <div className="flex items-center justify-center py-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="text-sm text-blue-600">جاري رفع الصورة...</span>
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
                  onChange={handleFileInputChange}
                  disabled={uploadingImage}
                  className="hidden"
                />
                📄 {uploadingImage ? "جارٍ الرفع..." : "رفع ملف"}
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