
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { db, storage } from "../lib/firebase";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { FieldValue } from 'firebase/firestore';
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
  "قانون",
];

type PostData = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  status: string;
  category: string;
  image?: string;
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
    if (!session?.user?.id) {
      console.error('No user session found');
      return null;
    }
    
    try {
      setUploadingImage(true);
      setMessage("جاري رفع الصورة...");
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error('نوع الملف غير مدعوم. يرجى تحميل صورة بصيغة JPG أو PNG أو WebP أو GIF.');
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.');
      }
      
      // Create a unique filename with timestamp and original filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const storagePath = `post-images/${session.user.id}/${fileName}`;
      
      // Create a reference to the storage location
      const storageRef = ref(storage, storagePath);
      
      console.log('Starting upload of:', file.name, 'to:', storagePath);
      
      try {
        // First, upload the file
        await uploadBytes(storageRef, file);
        
        // Then get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        setMessage("✅ تم رفع الصورة بنجاح");
        return downloadURL;
      } catch (error) {
        console.error("Error in upload process:", error);
        throw error; // Re-throw to be caught by the outer catch block
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage("فشل رفع الصورة: " + (error instanceof Error ? error.message : 'حدث خطأ غير معروف'));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const saveEdits = async () => {
    // التحقق من البيانات المطلوبة
    if (!selectedPost || !editor) {
      setMessage("خطأ: لا يوجد منشور محدد للتحرير");
      return;
    }

    // تعطيل الزر أثناء الحفظ
    setLoading(true);
    setMessage("جاري حفظ التعديلات...");

    try {
      let uploadedImageUrl = editImageUrl;
      
      // رفع الصورة الجديدة إذا وجدت
      if (editImageFile) {
        setMessage("جاري رفع الصورة...");
        setUploadingImage(true);
        try {
          const url = await handleImageUpload(editImageFile);
          if (url) {
            uploadedImageUrl = url;
            console.log('Image uploaded successfully, URL:', url);
          } else {
            throw new Error("فشل رفع الصورة: لم يتم الحصول على رابط صالح");
          }
        } catch (error) {
          console.error('Error in image upload:', error);
          setMessage("حدث خطأ أثناء رفع الصورة");
          setLoading(false);
          setUploadingImage(false);
          return; // Exit early if image upload fails
        } finally {
          setUploadingImage(false);
        }
      }

      if (!editTitle.trim()) {
        throw new Error("العنوان مطلوب");
      }

      if (!editCategory) {
        throw new Error("يرجى اختيار تصنيف");
      }

      // تحديث المستند
      setMessage("جاري حفظ التغييرات...");
      // Define the type for the update data
      type PostUpdateData = {
        title: string;
        excerpt: string;
        category: string;
        content: string;
        updatedAt: FieldValue;
        image?: string | null;
      };

      const updateData: PostUpdateData = {
        title: editTitle.trim(),
        excerpt: editExcerpt.trim(),
        category: editCategory,
        content: editor.getHTML(),
        updatedAt: serverTimestamp()
      };

      // Only update image field if we have a new image or explicitly setting to null
      if (uploadedImageUrl !== undefined) {
        updateData.image = uploadedImageUrl || null;
      }

      console.log('Updating post with data:', updateData);
      
      await updateDoc(doc(db, "posts", selectedPost.id), updateData);

      // إعادة تعيين الحقول بعد الحفظ الناجح
      setMessage("تم حفظ التعديلات بنجاح ✅");
      setSelectedPost(null);
      setEditTitle("");
      setEditExcerpt("");
      setEditCategory("");
      setEditImageUrl("");
      setEditImageFile(null);
      editor.commands.setContent("");
      setEditorContent("");

      // مسح المسودة المحفوظة
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }

      // إخفاء رسالة النجاح بعد 3 ثوانٍ
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      console.error("خطأ في حفظ التعديلات:", error);
      setMessage(`خطأ: ${error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}`);
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

            <div className="space-y-4">
              {message && (
                <div className={`p-3 rounded-lg text-sm font-medium ${message.includes('✅') || message.includes('نجاح') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {message}
                </div>
              )}
              <button
                type="button"
                onClick={saveEdits}
                disabled={loading || uploadingImage}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                  loading || uploadingImage
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {uploadingImage ? (
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
              <button
                type="button"
                onClick={() => {
                  setSelectedPost(null);
                  setEditTitle("");
                  setEditExcerpt("");
                  setEditCategory("");
                  setEditImageUrl("");
                  setEditImageFile(null);
                  editor?.commands.setContent("");
                  setEditorContent("");
                  setMessage(null);
                }}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
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
              <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
                <div className="md:flex">
                  {p.image && (
                    <div className="md:flex-shrink-0 md:w-48 h-48 md:h-auto relative">
                      <div className="mt-3">
                        <p className="text-xs text-gray-600 mb-2">معاينة الصورة:</p>
                        <div className="relative w-full h-48 rounded-lg border border-gray-300 overflow-hidden">
                          <Image
                            src={p.image}
                            alt="معاينة الصورة"
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'w-full h-full bg-gray-100 flex items-center justify-center';
                              const errorContent = document.createElement('div');
                              errorContent.className = 'text-center p-2';
                              const errorText = document.createElement('span');
                              errorText.className = 'text-gray-400 text-sm block';
                              errorText.textContent = 'تعذر تحميل الصورة';
                              errorContent.appendChild(errorText);
                              errorDiv.appendChild(errorContent);
                              target.parentNode?.insertBefore(errorDiv, target.nextSibling);
                            }}
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target?.src.startsWith('blob:')) {
                                URL.revokeObjectURL(target.src);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{p.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status === 'published' ? 'منشور' : 'مسودة'}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {p.category}
                      </span>
                    </div>
                    {p.excerpt && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{p.excerpt}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      بواسطة: {p.authorName || p.authorEmail || "غير معروف"}
                    </p>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => loadPostForEdit(p.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium flex items-center gap-1"
                    >
                      <span>✏️</span> تعديل
                    </button>
                    {p.status === "published" ? (
                      <button
                        onClick={() => setStatus(p.id, "draft")}
                        className="px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition text-sm font-medium flex items-center gap-1"
                      >
                        <span>📝</span> إلغاء النشر
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(p.id, "published")}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium flex items-center gap-1"
                      >
                        <span>✅</span> نشر
                      </button>
                    )}
                    <button
                      onClick={() => remove(p.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium flex items-center gap-1"
                    >
                      <span>🗑️</span> حذف
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


