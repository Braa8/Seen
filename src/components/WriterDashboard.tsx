"use client";

import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaListUl, FaListOl } from "react-icons/fa";
import { db } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEditor, EditorContent} from "@tiptap/react";
import { mergeAttributes } from '@tiptap/core';
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Image } from '@tiptap/extension-image';
import Link from "@tiptap/extension-link";
import NextImage from "next/image";

// Types for our custom image extension
interface CustomImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: {
    class: string;
    style: string;
    [key: string]: string;
  };
}

// Type for image attributes
interface ImageAttributes {
  src: string;
  alt?: string;
  [key: string]: string | undefined;
}

// Custom Image Extension with better typing
const CustomImage = Image.extend<CustomImageOptions>({
  name: 'customImage',
  addOptions() {
    return {
      inline: true,
      allowBase64: true,
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg mx-auto block',
        style: 'max-height: 500px; width: auto;',
      },
    };
  },
  
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('src'),
      },
      alt: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('alt'),
      },
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    return ['div', { class: 'my-4' }, ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]];
  },
  
  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const container = document.createElement('div');
      container.className = 'my-4';
      
      const img = document.createElement('img');
      const attrs = node.attrs as ImageAttributes;
      
      img.src = attrs.src || '';
      img.alt = attrs.alt || '';
      img.className = 'max-w-full h-auto rounded-lg mx-auto block';
      img.style.maxHeight = '500px';
      img.style.width = 'auto';
      
      // Apply any additional HTML attributes
      Object.entries(HTMLAttributes || {}).forEach(([key, value]) => {
        if (value !== undefined) {
          img.setAttribute(key, value);
        }
      });
      
      container.appendChild(img);
      return { dom: container };
    };
  }
});

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
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'اكتب مقالتك هنا...',
      }),
      CustomImage,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: editorContent,
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none',
      },
    },
    parseOptions: {
      preserveWhitespace: false,
    },
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
          setImageUrl(base64Image);
          return base64Image;
        }
        throw new Error('صيغة الصورة غير مدعومة. يرجى تحميل صورة صالحة.');
      }

      // If the image is small enough (less than 1MB), use it as is
      const base64Size = base64Image.length * (3/4); // Approximate size in bytes
      if (base64Size < 1024 * 1024) { // 1MB
        setImageUrl(base64Image);
        return base64Image;
      }

      // For larger images, compress them
      const img = new window.Image();
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
            setImageUrl(lowerQuality);
            resolve(lowerQuality);
          } else {
            setImageUrl(compressedBase64);
            resolve(compressedBase64);
          }
        };

        img.onerror = () => {
          const error = new Error('فشل تحميل الصورة');
          setMessage(`❌ ${error.message}`);
          reject(error);
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الصورة الرئيسية</label>
            <div className="flex items-center space-x-4">
              {imageUrl ? (
                <div className="relative w-20 h-20">
                  <NextImage
                    src={imageUrl}
                    alt="صورة المنشور"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    title="حذف الصورة"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <FaImage className="text-gray-400" />
                </div>
              )}
              <label className="flex-1">
                <div className="px-4 py-2 bg-white text-purple-600 rounded-lg border-2 border-dashed border-purple-300 cursor-pointer hover:bg-purple-50 text-center">
                  {imageUrl ? 'تغيير الصورة' : 'اختر صورة'}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        setMessage('🔄 جاري معالجة الصورة...');
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                          const base64Image = e.target?.result as string;
                          if (base64Image) {
                            const processedImage = await handleImageUpload(base64Image);
                            setImageUrl(processedImage);
                            setMessage('✅ تم تحميل الصورة بنجاح');
                            setTimeout(() => setMessage(null), 2000);
                          }
                        };
                        reader.readAsDataURL(file);
                      } catch (error) {
                        console.error('Error processing image:', error);
                        setMessage('❌ فشل تحميل الصورة');
                      }
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">محتوى المقال *</label>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-xs text-yellow-800">
              💡 <strong>نصيحة:</strong> يمكنك رفع ملف نصي أو Word أو PDF لإدراج المحتوى تلقائياً، أو الكتابة مباشرة في المحرر أدناه.
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded-t-lg border border-gray-200">
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
                  onClick={async () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      
                      try {
                        setMessage('🔄 جاري معالجة الصورة...');
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                          const base64Image = e.target?.result as string;
                          if (base64Image) {
                            try {
                              const processedImage = await handleImageUpload(base64Image);
                              if (editor) {
                                // Create a container div with the desired classes
                                const imageHtml = `
                                  <div class="image-container my-4">
                                    <img 
                                      src="${processedImage}" 
                                      alt="صورة مرفوعة" 
                                      class="max-w-full h-auto rounded-lg mx-auto block"
                                      style="max-height: 500px; width: auto;"
                                    />
                                  </div>
                                `;
                                // Insert the HTML at the current cursor position
                                editor.chain().focus().insertContent(imageHtml).run();
                                setMessage('✅ تم إضافة الصورة بنجاح');
                                setTimeout(() => setMessage(null), 2000);
                              }
                            } catch (error) {
                              console.error('Error processing image:', error);
                              setMessage('❌ فشل معالجة الصورة');
                            }
                          }
                        };
                        reader.readAsDataURL(file);
                      } catch (error) {
                        console.error('Error reading file:', error);
                        setMessage('❌ حدث خطأ أثناء قراءة الملف');
                      }
                    };
                    input.click();
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