"use client";

import PostCard from '../../components/PostCard';
import Link from 'next/link';
import LoadingPage from '../../components/LoadingPage';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  category: string;
  image?: string;
}

function PostsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'posts'),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts: Post[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedPosts.push({
          id: doc.id, // استخدام Firebase document ID مباشرة
          title: data.title || '',
          excerpt: data.excerpt || data.content?.substring(0, 150) + '...' || '',
          content: data.content || '',
          author: data.authorName || data.authorEmail || 'Unknown',
          date: data.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          category: data.category || 'Uncategorized',
          image: data.image || undefined
        });
      });
      setPosts(fetchedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // قائمة الأقسام المتاحة (عدّلها كما تريد)
  const categoryOptions = [
    { value: 'All', label: 'الكل' },
    {value: 'Opinion', label: 'رأي' },
    { value: 'Technology', label: 'تقنية' },
    { value: 'Business', label: 'أعمال' },
    { value: 'Sports', label: 'رياضة' },
    { value: 'News', label: 'أخبار' },
    { value: 'Lifestyle', label: 'نمط حياة' },
    { value: 'Health', label: 'صحة' },
    { value: 'Investigative reports', label: 'التحقيقات الاستقصائية' },
    { value: 'Education', label: 'تعليم' }
  ];

  // تصفية المنشورات
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gray-300 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold font-serif text-gray-800 mb-2">المقالات</h1>
            </div>
            <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition hover:scale-95">
              ← العودة للرئيسية
            </Link>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="ابحث 🔍"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {categoryOptions.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-500">لا توجد منشورات</p>
            <p className="text-gray-400 mt-2">جرب تعديل البحث أو الفلتر</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              عرض {filteredPosts.length} {filteredPosts.length === 1 ? 'منشور' : 'منشورات'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PostsPage;
