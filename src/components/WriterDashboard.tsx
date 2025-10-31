"use client";

import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaListUl, FaListOl } from "react-icons/fa";
import { db } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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

  const handleImageUpload = async (base64Image: string): Promise<string> => {
    if (!session?.user?.id) {
      const errorMsg = '❌ لم يتم العثور على جلسة مستخدم';
      console.error(errorMsg);
      setMessage(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setIsUploading(true);
      setMessage('🔄 جاري حفظ الصورة...');

      // Check if the image is a base64 string
      if (!base64Image.startsWith('data:image/')) {
        // If it's a URL, return it as is
        if (base64Image.startsWith('http')) {
          return base64Image;
        }
        throw new Error('صيغة الصورة غير مدعومة. يرجى تحميل صورة صالحة.');
      }

      // If the image is small enough (less than 1MB), use it as is
      const base64Size = base64Image.length * (3/4); // Approximate size in bytes
      if (base64Size < 1024 * 1024) { // 1MB
        return base64Image;
      }

      // For larger images, compress them
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create a promise to handle the image loading and compression
      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Calculate new dimensions (max 1200px width or height)
          const maxSize = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with 80% quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          
          // If still too large, reduce quality further
          if (compressedBase64.length > 1024 * 1024) { // 1MB
            const lowerQuality = canvas.toDataURL('image/jpeg', 0.6);
            resolve(lowerQuality);
          } else {
            resolve(compressedBase64);
          }
        };

        img.onerror = () => {
          reject(new Error('فشل تحميل الصورة'));
        };

        // Start loading the image
        img.src = base64Image;
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف';
      setMessage(`❌ فشل معالجة الصورة: ${errorMessage}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      setMessage("❌ يجب تسجيل الدخول أولاً");
      return;
    }

    if (!title.trim() || !editor?.getText().trim()) {
      setMessage("❌ العنوان والمحتوى مطلوبان");
      return;
    }

    setLoading(true);
    setMessage("جاري حفظ المقال...");

    try {
      let imageToSave = imageUrl;
      
      // Process image if a new one was uploaded
      if (imageUrl && imageUrl.startsWith('data:image/')) {
        try {
          setMessage("🔄 جاري معالجة الصورة...");
          imageToSave = await handleImageUpload(imageUrl);
        } catch (error) {
          console.error("Image processing failed:", error);
          setMessage("❌ فشل معالجة الصورة. سيتم حفظ المقال بدون صورة.");
          imageToSave = "";
        }
      }

      // Prepare post data
      const postData = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: editor.getHTML(),
        status: "draft",
        category: category || "عام",
        image: imageToSave,
        authorId: session.user.id,
        authorName: session.user.name || "مستخدم مجهول",
        authorEmail: session.user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, "posts"), postData);

      // Clear form
      setTitle("");
      setExcerpt("");
      setCategory("عام");
      setImageUrl("");
      editor.commands.clearContent();
      
      // Clear draft from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
      }

      setMessage("✅ تم حفظ المقال بنجاح");
      
      // Notify parent component if needed
      if (onPublished) {
        onPublished(docRef.id);
      }
      
      // Reset message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      console.error("Error saving post:", error);
      setMessage(`❌ حدث خطأ أثناء حفظ المقال: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
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