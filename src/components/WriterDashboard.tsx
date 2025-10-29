"use client";

import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaListUl, FaListOl } from "react-icons/fa";
import { db, storage } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import ImageUploader from "./common/ImageUploader";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editorContent, setEditorContent] = useState("");

  const storageKey = useMemo(
    () => `writer-draft:${session?.user?.id ?? "guest"}`,
    [session?.user?.id]
  );

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
          } else {
            localStorage.removeItem(storageKey);
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

  const handleImageUpload = async (file: File): Promise<string> => {
    if (!session?.user?.id) {
      throw new Error('No user session found');
    }

    try {
      setIsUploading(true);
      setMessage("🔄 جاري رفع الصورة...");

      // Create a unique filename with timestamp and original filename
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `img_${Date.now()}.${fileExt}`;
      const storagePath = `post-images/${session.user.id}/${fileName}`;

      // Create a reference to the storage location
      const storageRef = ref(storage, storagePath);
      
      // Add metadata to help with CORS and caching
      const metadata = {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      };

      // Upload the file with metadata
      // Upload the file with metadata (snapshot is not used but kept for future reference)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const snapshot = await uploadBytes(storageRef, file, metadata);
      
      // Get the download URL with token
      const downloadURL = await getDownloadURL(storageRef);
      
      if (!downloadURL) {
        throw new Error('Failed to get image URL');
      }
      
      // Update the image URL and file
      setImageUrl(downloadURL);
      setImageFile(file);
      setMessage("✅ تم رفع الصورة بنجاح");
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      
      // More detailed error handling
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('cors')) {
          errorMessage = 'CORS issue. Please check storage settings';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Insufficient permissions to upload file';
        } else {
          errorMessage = error.message;
        }
      }
      
      throw new Error(`Failed to upload file: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!session?.user) {
      setMessage("❌ يجب تسجيل الدخول أولاً");
      return;
    }

    if (!title.trim() || !excerpt.trim() || !editorContent.trim()) {
      setMessage("❌ الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    // If there's an image file but no URL, it means it's still uploading
    if (imageFile && !imageUrl) {
      setMessage("🔄 جاري رفع الصورة، الرجاء الانتظار...");
      return;
    }

    setLoading(true);
    setMessage("جاري نشر المنشور...");

    try {
      // Save to Firestore
      const postData = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: editorContent,
        category,
        status: "pending" as const,
        authorName: session.user.name || "مستخدم مجهول",
        authorEmail: session.user.email || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(imageUrl && { image: imageUrl }), // Only include if imageUrl exists
      };

      const docRef = await addDoc(collection(db, "posts"), postData);

      // Clear the form
      setTitle("");
      setExcerpt("");
      setImageUrl("");
      setImageFile(null);
      editor?.commands.setContent("");
      setEditorContent("");

      // Clear the draft
      localStorage.removeItem(storageKey);

      setMessage("✅ تم إرسال المنشور بنجاح في انتظار المراجعة");
      
      // Notify parent component if needed
      if (onPublished) {
        onPublished(docRef.id);
      }
    } catch (error) {
      console.error("Error adding document: ", error);
      setMessage(`❌ حدث خطأ أثناء محاولة نشر المنشور: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>جاري تحميل بيانات المستخدم...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-right">إنشاء منشور جديد</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">عنوان المقال *</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل عنوان المقال (حقل مطلوب)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المقتطف (اختياري)</label>
            <textarea
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="اكتب ملخصاً مختصراً للمقال"
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">التصنيف *</label>
            <select
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {WRITER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              صورة المنشور (اختياري)
            </label>
            <ImageUploader 
              onImageUpload={handleImageUpload}
              previewClassName="max-w-full"
              initialImage={imageUrl}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">محتوى المقال *</label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-xs text-yellow-800">
              💡 <strong>نصيحة:</strong> يمكنك رفع ملف نصي أو Word أو PDF لإدراج المحتوى تلقائياً، أو الكتابة مباشرة في المحرر أدناه.
            </div>

            <div className="mb-4">
              <div className="flex gap-2 flex-wrap bg-gray-50 p-2 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor?.isActive('bold') ? 'bg-gray-200' : ''
                  }`}
                  title="عريض"
                >
                  <FaBold />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor?.isActive('italic') ? 'bg-gray-200' : ''
                  }`}
                  title="مائل"
                >
                  <FaItalic />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor?.isActive('underline') ? 'bg-gray-200' : ''
                  }`}
                  title="تحته خط"
                >
                  <FaUnderline />
                </button>
                <div className="w-px bg-gray-300 mx-1"></div>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt('أدخل رابط URL:');
                    if (url) {
                      editor?.chain().focus().setLink({ href: url }).run();
                    }
                  }}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor?.isActive('link') ? 'bg-gray-200' : ''
                  }`}
                  title="إضافة رابط"
                >
                  <FaLink />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt('أدخل رابط الصورة:');
                    if (url) {
                      editor?.chain().focus().setImage({ src: url }).run();
                    }
                  }}
                  className="p-2 rounded hover:bg-gray-200"
                  title="إدراج صورة"
                >
                  <FaImage />
                </button>
                <div className="w-px bg-gray-300 mx-1"></div>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor?.isActive('bulletList') ? 'bg-gray-200' : ''
                  }`}
                  title="قائمة نقطية"
                >
                  <FaListUl />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor?.isActive('orderedList') ? 'bg-gray-200' : ''
                  }`}
                  title="قائمة رقمية"
                >
                  <FaListOl />
                </button>
              </div>
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
            type="submit"
            disabled={loading || isUploading}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
              loading || isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
          >
            {loading ? 'جاري النشر...' : isUploading ? 'جاري رفع الصورة...' : 'إرسال للنشر'}
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
        </form>
      </div>
    </div>
  );
}