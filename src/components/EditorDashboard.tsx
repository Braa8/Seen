"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { db } from "../lib/firebase";
import { FieldValue} from 'firebase/firestore';
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
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaListUl, FaListOl } from "react-icons/fa";
import Image from "next/image";

// Constants
const DRAFT_TTL_MS = 60 * 60 * 1000;
const EDITOR_CATEGORIES = [
  "تقنية", "سياسة", "تصميم", "أعمال", "رياضة", "أخبار", "اقتصاد", 
  "صحة", "تعليم", "رأي", "التحقيقات الاستقصائية", "أسلوب حياة", "قانون",
] as const;

// Types
type PostStatus = "draft" | "published";
type Category = typeof EDITOR_CATEGORIES[number];

interface PostData {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  status: PostStatus;
  category: Category | string;
  image?: string;
  authorName?: string;
  authorEmail?: string;
  createdAt?: unknown;
}

interface DraftData {
  timestamp: number;
  data: {
    selectedPost?: PostData | null;
    title?: string;
    excerpt?: string;
    category?: string;
    imageUrl?: string;
    content?: string;
  };
}

interface PostUpdateData extends Record<string, unknown> {
  title: string;
  excerpt: string;
  category: string;
  content: string;
  updatedAt: FieldValue;
  image?: string | null;
}

interface DraftState {
  selectedPost: PostData | null;
  title: string;
  excerpt: string;
  category: string;
  imageUrl: string;
  content: string;
}

// Custom Hooks
const usePosts = () => {
  const [posts, setPosts] = useState<PostData[]>([]);
  
  const postsQuery = useMemo(() => 
    query(
      collection(db, "posts"),
      where("status", "in", ["draft", "published"]),
      orderBy("createdAt", "desc")
    ), []
  );

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
          image: data.image || "",
          authorName: data.authorName,
          authorEmail: data.authorEmail,
          createdAt: data.createdAt
        });
      });
      setPosts(list);
    });
    return () => unsub();
  }, [postsQuery]);

  return posts;
};

const useEditorDraft = (sessionId: string | undefined, editor: Editor | null) => {
  const [draftData, setDraftData] = useState<DraftState>({
    selectedPost: null,
    title: "",
    excerpt: "",
    category: "",
    imageUrl: "",
    content: ""
  });

  const draftLoadedRef = useRef(false);
  const storageKey = `editor-draft:${sessionId ?? "guest"}`;

  const saveDraft = useCallback((data: DraftState) => {
    if (typeof window === "undefined") return;

    const hasData = data.title.trim() || data.excerpt.trim() || 
                   (data.content && data.content !== "<p></p>") || data.imageUrl;

    if (!hasData) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const payload: DraftData = {
      timestamp: Date.now(),
      data: {
        selectedPost: data.selectedPost,
        title: data.title,
        excerpt: data.excerpt,
        category: data.category,
        imageUrl: data.imageUrl.startsWith("blob:") ? "" : data.imageUrl,
        content: data.content,
      },
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [storageKey]);

  const loadDraft = useCallback(() => {
    if (!editor || draftLoadedRef.current || typeof window === "undefined") return;
    
    draftLoadedRef.current = true;
    
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const saved: DraftData = JSON.parse(raw);
      if (!saved?.data) return;

      // Check if draft is expired
      if (Date.now() - saved.timestamp > DRAFT_TTL_MS) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      const { data } = saved;
      setDraftData({
        selectedPost: data.selectedPost || null,
        title: data.title || "",
        excerpt: data.excerpt || "",
        category: data.category || "",
        imageUrl: data.imageUrl || "",
        content: data.content || ""
      });

      if (data.content) {
        editor.commands.setContent(data.content);
      }
    } catch (error) {
      console.error("Failed to restore editor draft", error);
    }
  }, [editor, storageKey]);

  const clearDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    draftData,
    setDraftData,
    saveDraft,
    loadDraft,
    clearDraft
  };
};

const useImageUpload = (sessionId: string | undefined) => {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const processImage = useCallback(async (base64Image: string): Promise<string> => {
    if (!sessionId) {
      const errorMsg = '❌ لم يتم العثور على جلسة مستخدم';
      setMessage(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setIsUploading(true);
      setMessage("🔄 جاري معالجة الصورة...");

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
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
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
  }, [sessionId]);

  return {
    isUploading,
    message,
    uploadImage: processImage,
    setMessage
  };
};

// Components
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
  </div>
);

const AccessDenied = () => (
  <div className="min-h-screen flex items-center justify-center">
    <p className="text-center py-20 text-xl text-gray-700">
      لا تملك صلاحيات الوصول إلى لوحة المحرر.
    </p>
  </div>
);

interface ToolbarButton {
  icon: React.ComponentType;
  action: () => void;
  active?: boolean;
  title: string;
}

interface EditorToolbarProps {
  editor: Editor | null;
  uploadImage: (base64Image: string) => Promise<string>;
  setMessage: (message: string | null) => void;
}

const EditorToolbar = ({ editor, uploadImage, setMessage }: EditorToolbarProps) => {
  const toolbarButtons: ToolbarButton[] = [
    {
      icon: FaBold,
      action: () => editor?.chain().focus().toggleBold().run(),
      active: editor?.isActive('bold'),
      title: "عريض"
    },
    {
      icon: FaItalic,
      action: () => editor?.chain().focus().toggleItalic().run(),
      active: editor?.isActive('italic'),
      title: "مائل"
    },
    {
      icon: FaUnderline,
      action: () => editor?.chain().focus().toggleUnderline().run(),
      active: editor?.isActive('underline'),
      title: "تحته خط"
    },
    {
      icon: FaLink,
      action: () => {
        const url = window.prompt('أدخل رابط URL:');
        if (url) editor?.chain().focus().setLink({ href: url }).run();
      },
      active: editor?.isActive('link'),
      title: "إضافة رابط"
    },
    {
      icon: FaImage,
      action: () => {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        // Handle file selection
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          
          try {
            // Read the file as base64
            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64Image = e.target?.result as string;
              if (base64Image) {
                try {
                  setMessage('🔄 جاري معالجة الصورة...');
                  const processedImage = await uploadImage(base64Image);
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
            console.error('Error uploading image:', error);
            setMessage('❌ حدث خطأ أثناء رفع الصورة');
          }
        };
        
        // Trigger the file input dialog
        input.click();
      },
      title: "إدراج صورة"
    },
    {
      icon: FaListUl,
      action: () => editor?.chain().focus().toggleBulletList().run(),
      active: editor?.isActive('bulletList'),
      title: "قائمة نقطية"
    },
    {
      icon: FaListOl,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
      active: editor?.isActive('orderedList'),
      title: "قائمة رقمية"
    }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {toolbarButtons.map((button, index) => {
        const IconComponent = button.icon;
        return (
          <div key={button.title}>
            <button
              type="button"
              onClick={button.action}
              className={`p-2 rounded hover:bg-gray-200 ${
                button.active ? 'bg-gray-200' : ''
              }`}
              title={button.title}
            >
              <IconComponent />
            </button>
            {index === 2 && <div className="w-px bg-gray-300 mx-1" />}
          </div>
        );
      })}
    </div>
  );
};

const MessageAlert = ({ message }: { message: string | null }) => {
  if (!message) return null;

  const isSuccess = message.includes('✅') || message.includes('نجاح');
  const bgColor = isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

  return (
    <div className={`p-3 rounded-lg text-sm font-medium ${bgColor}`}>
      {message}
    </div>
  );
};

const SaveButton = ({ loading, isUploading, onClick }: { 
  loading: boolean; 
  isUploading: boolean; 
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || isUploading}
    className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
      loading || isUploading
        ? 'bg-gray-400 cursor-not-allowed'
        : 'bg-purple-600 hover:bg-purple-700 text-white'
    }`}
  >
    {isUploading ? (
      'جاري رفع الصورة...'
    ) : loading ? (
      <span className="flex items-center justify-center gap-2">
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        جاري الحفظ...
      </span>
    ) : (
      'حفظ التعديلات'
    )}
  </button>
);

const PostItem = ({ 
  post, 
  onEdit, 
  onStatusChange, 
  onDelete 
}: { 
  post: PostData;
  onEdit: (id: string) => void;
  onStatusChange: (id: string, status: PostStatus) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
    <h3 className="font-medium text-lg text-gray-800">{post.title}</h3>
    <p className="text-gray-600 text-sm mt-1">{post.excerpt}</p>
    <div className="flex justify-between items-center mt-3">
      <span className="text-sm text-gray-500">{post.category}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onStatusChange(post.id, post.status === 'draft' ? 'published' : 'draft')}
          className={`px-3 py-1 text-sm rounded ${
            post.status === 'draft' 
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {post.status === 'draft' ? 'نشر' : 'إرسال إلى المسودات'}
        </button>
        <button
          onClick={() => onEdit(post.id)}
          className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
        >
          تعديل
        </button>
        <button
          onClick={() => onDelete(post.id)}
          className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
        >
          حذف
        </button>
      </div>
    </div>
  </div>
);

// Main Component
export default function EditorDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  
  // Custom Hooks
  const posts = usePosts();
  const { isUploading, message, uploadImage, setMessage } = useImageUpload(session?.user?.id);
  
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

  const { draftData, setDraftData, saveDraft, loadDraft, clearDraft } = useEditorDraft(session?.user?.id, editor);

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Effect for editor updates
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      setDraftData(prev => ({ ...prev, content: editor.getHTML() }));
    };
    
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, setDraftData]);

  // Effect for loading draft
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Effect for saving draft
  useEffect(() => {
    saveDraft(draftData);
  }, [draftData, saveDraft]);

  // Permissions
  const canModerate = useMemo(() => 
    Array.isArray(session?.user?.roles) && 
    (session!.user.roles.includes("editor") || session!.user.roles.includes("admin")),
    [session]
  );

  // Handlers
  const loadPostForEdit = useCallback(async (postId: string) => {
    try {
      const docSnap = await getDoc(doc(db, "posts", postId));
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        let cleanContent = data.content || "";
        
        if (typeof cleanContent === 'string') {
          cleanContent = cleanContent.replace(/blob:https?:\/\/[^\s"']+/g, '');
        }

        const post: PostData = {
          id: docSnap.id,
          title: data.title || "",
          excerpt: data.excerpt || "",
          content: cleanContent,
          status: data.status || "draft",
          category: data.category || "",
          authorName: data.authorName,
          authorEmail: data.authorEmail
        };

        setDraftData({
          selectedPost: post,
          title: post.title,
          excerpt: post.excerpt,
          category: post.category,
          imageUrl: data.image && !data.image.startsWith('blob:') ? data.image : "",
          content: cleanContent
        });

        if (editor) {
          editor.commands.setContent(cleanContent);
        }
      } else {
        setMessage("❌ لم يتم العثور على المنشور");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setMessage(`❌ فشل تحميل المنشور: ${errorMessage}`);
    }
  }, [editor, setDraftData, setMessage]);

  const saveEdits = useCallback(async (): Promise<void> => {
    if (!draftData.selectedPost || !editor) {
      setMessage("❌ خطأ: لا يوجد منشور محدد للتحرير");
      return;
    }

    setLoading(true);
    setMessage("🔄 جاري حفظ التعديلات...");

    try {
      let imageToSave = draftData.imageUrl;

      // Process image if a new one was uploaded
      if (draftData.imageUrl && draftData.imageUrl.startsWith('data:image/')) {
        try {
          setMessage("🔄 جاري معالجة الصورة...");
          imageToSave = await uploadImage(draftData.imageUrl);
        } catch (error) {
          console.error("Image processing failed:", error);
          setMessage("❌ فشل معالجة الصورة. سيتم حفظ التعديلات بدون تغيير الصورة.");
          // Keep the original image URL if processing fails
          imageToSave = draftData.selectedPost?.image || "";
        }
      }

      if (!draftData.title.trim()) throw new Error("❌ العنوان مطلوب");
      if (!draftData.category) throw new Error("❌ يرجى اختيار تصنيف");

      // Prepare update data
      const updateData: PostUpdateData = {
        title: draftData.title.trim(),
        excerpt: draftData.excerpt.trim(),
        category: draftData.category,
        content: editor.getHTML(),
        updatedAt: serverTimestamp(),
        image: imageToSave || null
      };

      // Update the document in Firestore
      await updateDoc(doc(db, "posts", draftData.selectedPost.id), updateData);

      setMessage("✅ تم حفظ التعديلات بنجاح");
      
      // Clear the draft after successful save
      clearDraft();
      
      // Reset message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving edits:", error);
      setMessage(`❌ خطأ: ${error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}`);
    } finally {
      setLoading(false);
    }
  }, [draftData, editor, uploadImage, clearDraft, setMessage]);

  const setStatus = useCallback(async (postId: string, toStatus: PostStatus) => {
    if (!canModerate) return;
    try {
      await updateDoc(doc(db, "posts", postId), { 
        status: toStatus, 
        updatedAt: serverTimestamp() 
      });
      setMessage(`تم تغيير الحالة إلى ${toStatus === 'published' ? 'منشور' : 'مسودة'} ✅`);
    } catch {
      setMessage("تعذر تغيير الحالة");
    }
  }, [canModerate, setMessage]);

  const remove = useCallback(async (postId: string) => {
    if (!canModerate || !confirm("هل أنت متأكد من حذف هذا المنشور؟")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      setMessage("تم الحذف ✅");
    } catch {
      setMessage("تعذر الحذف");
    }
  }, [canModerate, setMessage]);

  const resetEditor = useCallback(() => {
    setDraftData({
      selectedPost: null,
      title: "",
      excerpt: "",
      category: "",
      imageUrl: "",
      content: ""
    });
    editor?.commands.setContent("");
    setMessage(null);
  }, [editor, setDraftData, setMessage]);

  const handleImagePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Image = e.target?.result as string;
            if (base64Image) {
              try {
                setMessage("🔄 جاري معالجة الصورة المنسوخة...");
                const processedImage = await uploadImage(base64Image);
                if (editor) {
                  // Create a container div with the desired classes
                  const imageHtml = `
                    <div class="image-container">
                      <img 
                        src="${processedImage}" 
                        alt="صورة منسوخة" 
                        title="صورة منسوخة" 
                        class="max-w-full h-auto rounded-lg"
                      />
                    </div>
                  `;
                  
                  // Insert the HTML at the current cursor position
                  editor.chain().focus().insertContent(imageHtml).run();
                  
                  setMessage("✅ تم إضافة الصورة بنجاح");
                  setTimeout(() => setMessage(null), 2000);
                }
              } catch (error) {
                console.error('Error handling pasted image:', error);
                setMessage("❌ فشل معالجة الصورة المنسوخة");
              }
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, [editor, uploadImage, setMessage]);

  // Early returns
  if (loading) return <LoadingSpinner />;
  if (!canModerate) return <AccessDenied />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📝 لوحة المحرر</h1>
          <p className="text-gray-600">مراجعة وإدارة المنشورات</p>
        </div>

        {/* Editor Form */}
        {draftData.selectedPost && (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">تعديل المنشور</h2>
              <button
                type="button"
                onClick={resetEditor}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ إغلاق
              </button>
            </div>

            <MessageAlert message={message} />

            {/* Form Fields */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={draftData.title}
                  onChange={(e) => setDraftData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الصورة الرئيسية</label>
                <div className="flex items-center space-x-4">
                  {draftData.imageUrl ? (
                    <div className="relative w-20 h-20">
                      <Image
                        src={draftData.imageUrl}
                        alt="صورة المنشور"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setDraftData(prev => ({ ...prev, imageUrl: '' }))}
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
                      {draftData.imageUrl ? 'تغيير الصورة' : 'اختر صورة'}
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
                                const processedImage = await uploadImage(base64Image);
                                setDraftData(prev => ({ ...prev, imageUrl: processedImage }));
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
                <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={draftData.category}
                  onChange={(e) => setDraftData(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">اختر القسم</option>
                  {EDITOR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الملخص</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-2 h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={draftData.excerpt}
                  onChange={(e) => setDraftData(prev => ({ ...prev, excerpt: e.target.value }))}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">المحتوى</label>
                  <EditorToolbar 
                    editor={editor} 
                    uploadImage={uploadImage} 
                    setMessage={setMessage} 
                  />
                </div>
                <div className="border border-gray-300 rounded-lg p-4 min-h-[300px]">
                  <EditorContent editor={editor} onPaste={handleImagePaste} />
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <SaveButton 
                  loading={loading} 
                  isUploading={isUploading} 
                  onClick={saveEdits} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Posts List */}
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

          <div className="space-y-4">
            {posts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
                onEdit={loadPostForEdit}
                onStatusChange={setStatus}
                onDelete={remove}
              />
            ))}
            {posts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                لا توجد منشورات متاحة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}