"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { db, storage } from "../lib/firebase";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { motion } from "motion/react";
import LoadingPage from "./LoadingPage";
import Image from "next/image";
import type { Session } from "next-auth";

// Custom hook for image compression and base64 conversion
function useImageCompression() {
  return useCallback((file: File): Promise<{ base64: string; blob: Blob }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new window.Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800; // Maximum width/height
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
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
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('فشل تحميل سياق الرسم'));
            return;
          }
          
          // Draw image with new dimensions
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 and Blob
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ base64, blob });
              } else {
                reject(new Error('فشل تحويل الصورة'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        
        img.onerror = () => reject(new Error('خطأ في معالجة الصورة'));
        
        if (event.target?.result) {
          img.src = event.target.result as string;
        } else {
          reject(new Error('فشل قراءة بيانات الصورة'));
        }
      };
      
      reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
      reader.readAsDataURL(file);
    });
  }, []);
}

export default function ProfileDashboard() {
  const { data: session, update } = useSession();
  const [name, setName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<Session['user'] | null>(null);
  const [myPosts, setMyPosts] = useState<Array<{ id: string; title: string; status: string; content: string; createdAt?: unknown }>>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const compressImage = useImageCompression();

  // Update session user when session changes
  useEffect(() => {
    if (session?.user) {
      setSessionUser(session.user);
    }
  }, [session]);

  // Set initial loading state
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

  // Move onSelectFile before any conditional returns
  const onSelectFile = useCallback(async (file?: File) => {
    if (!file || !sessionUser?.id) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('❌ يرجى تحميل ملف صورة صالح');
      return;
    }

    try {
      setUploading(true);
      setMessage('🔄 جاري معالجة الصورة...');

      // Compress the image and get base64
      const { base64, blob } = await compressImage(file);
      
      // Show preview from base64
      setPreviewUrl(base64);
      
      // Upload the compressed image to Firebase
      const avatarRef = ref(storage, `avatars/${sessionUser.id}`);
      await uploadBytes(avatarRef, blob);
      
      // Get the download URL
      const url = await getDownloadURL(avatarRef);
      
      // Update user document with both URL and base64
      await updateDoc(doc(db, "users", sessionUser.id), { 
        image: url,
        imageBase64: base64, // Store base64 for faster initial load
        updatedAt: new Date().toISOString()
      });
      
      // Update the session
      await update();
      
      setMessage('✅ تم تحديث الصورة بنجاح');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage('❌ فشل رفع الصورة. يرجى المحاولة مرة أخرى');
    } finally {
      setUploading(false);
    }
  }, [sessionUser?.id, update, compressImage]);

  // Clean up preview URL when component unmounts or previewUrl changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Update name when session user changes
  useEffect(() => {
    if (sessionUser?.name) {
      setName(sessionUser.name);
    }
  }, [sessionUser, setName]);

  if (pageLoading) {
    return <LoadingPage />;
  }

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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الصورة الشخصية</label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                    {(previewUrl || session?.user?.image) ? (
                      <Image 
                        src={previewUrl || sessionUser?.image || ''} 
                        alt="الصورة الشخصية"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        unoptimized={!!previewUrl}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        onSelectFile(e.target.files[0]);
                        // Reset the input to allow selecting the same file again
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>جاري الرفع...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>{sessionUser?.image ? 'تغيير الصورة' : 'اختر صورة'}</span>
                      </>
                    )}
                  </button>
                  {sessionUser?.image && !uploading && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setUploading(true);
                          await updateDoc(doc(db, "users", sessionUser.id), { 
                            image: null,
                            updatedAt: new Date().toISOString()
                          });
                          await update();
                          setPreviewUrl(null);
                          setMessage('تم حذف الصورة بنجاح');
                          setTimeout(() => setMessage(''), 3000);
                        } catch (error) {
                          console.error('Error removing image:', error);
                          setMessage('❌ فشل حذف الصورة');
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>حذف الصورة</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">يُفضل أن تكون الصورة مربعة وبجودة عالية</p>
            </div>
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


