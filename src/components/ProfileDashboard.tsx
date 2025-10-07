"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { db, storage } from "../lib/firebase";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { motion } from "motion/react";
import LoadingPage from "./LoadingPage";

export default function ProfileDashboard() {
  const { data: session, update } = useSession();
  const [name, setName] = useState<string>(session?.user?.name || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [myPosts, setMyPosts] = useState<Array<{ id: string; title: string; status: string; content: string; createdAt?: unknown }>>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const postsQuery = useMemo(() => {
    if (!session?.user?.id) return null;
    // نعرض جميع المنشورات (المسودات والمنشورة)
    return query(
      collection(db, "posts"),
      where("authorId", "==", session.user.id),
      orderBy("createdAt", "desc")
    );
  }, [session?.user?.id]);

  useEffect(() => {
    if (!postsQuery) return;
    const unsub = onSnapshot(
      postsQuery,
      (snap) => {
        const arr: Array<{ id: string; title: string; status: string; content: string; createdAt?: unknown }> = [];
        snap.forEach((d) => {
          const data = d.data();
          arr.push({
            id: d.id,
            title: data.title || "بدون عنوان",
            status: data.status || "draft",
            content: data.content || "",
            createdAt: data.createdAt
          });
        });
        setMyPosts(arr);
        console.log("Posts loaded:", arr.length);
      },
      (error) => {
        console.error("Error loading posts:", error);
        setMessage("خطأ في تحميل المنشورات: " + error.message);
      }
    );
    return () => {
      try { unsub(); } catch {}
    };
  }, [postsQuery]);

  if (pageLoading) {
    return <LoadingPage />;
  }

  const onSelectFile = async (file?: File) => {
    if (!file || !session?.user?.id) return;
    try {
      setUploading(true);
      const avatarRef = ref(storage, `avatars/${session.user.id}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);
      await updateDoc(doc(db, "users", session.user.id), { image: url });
      await update();
      setMessage("تم تحديث الصورة");
    } catch {
      setMessage("تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const onSaveName = async () => {
    if (!session?.user?.id) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "users", session.user.id), { name: name.trim() });
      await update();
      setMessage("تم حفظ الاسم");
    } catch {
      setMessage("تعذر حفظ الاسم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">👤 الملف الشخصي</h1>
          <p className="text-gray-600">إدارة معلوماتك الشخصية ومنشوراتك</p>
        </div>

        {/* معلومات الملف الشخصي */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">المعلومات الشخصية</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
            <input 
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
            <button 
              onClick={onSaveName} 
              disabled={saving} 
              className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ الاسم"}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الصورة الشخصية</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => onSelectFile(e.target.files?.[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              {uploading ? "جارٍ الرفع..." : "اختر صورة"}
            </button>
          </div>

          {message && (
            <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
              {message}
            </div>
          )}
        </div>

        {/* منشوراتي - Carousel */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">📝 منشوراتي</h2>
          
          {myPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">لا توجد منشورات بعد</p>
              <p className="text-sm mt-2">ابدأ بكتابة أول مقال لك!</p>
            </div>
          ) : (
            <div className="relative">
              {/* Carousel Container */}
              <div className="overflow-hidden">
                <motion.div
                  className="flex"
                  animate={{ x: `-${currentSlide * 100}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {myPosts.map((p) => (
                    <div key={p.id} className="min-w-full px-2">
                      <div className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-br from-white to-blue-50 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-2xl font-bold text-gray-800 flex-1">{p.title}</h3>
                          <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-md ${
                            p.status === 'published' 
                              ? 'bg-gradient-to-r from-green-400 to-green-600 text-white' 
                              : 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
                          }`}>
                            {p.status === 'published' ? '✅ منشور' : '📝 مسودة'}
                          </span>
                        </div>
                        <div 
                          className="text-gray-700 leading-relaxed line-clamp-4 mb-4" 
                          dangerouslySetInnerHTML={{ __html: p.content }} 
                        />
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <span className="text-sm text-gray-500">
                            {p.createdAt && typeof p.createdAt === 'object' && 'toDate' in p.createdAt 
                              ? new Date((p.createdAt as { toDate: () => Date }).toDate()).toLocaleDateString('ar-EG') 
                              : 'تاريخ غير محدد'}
                          </span>
                          <a 
                            href={`/Posts/${p.id}`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                          >
                            عرض المقال →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Navigation Buttons */}
              {myPosts.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition z-10"
                  >
                    <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentSlide(Math.min(myPosts.length - 1, currentSlide + 1))}
                    disabled={currentSlide === myPosts.length - 1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition z-10"
                  >
                    <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {myPosts.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {myPosts.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-3 rounded-full transition-all ${
                        currentSlide === index 
                          ? 'w-8 bg-blue-600' 
                          : 'w-3 bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Counter */}
              {myPosts.length > 1 && (
                <div className="text-center mt-4 text-sm text-gray-600">
                  {currentSlide + 1} / {myPosts.length}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


