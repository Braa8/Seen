"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Post } from '@/data/posts';
import Image from 'next/image';

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPost({
            id: postId,
            title: data.title || '',
            excerpt: data.excerpt || data.content?.substring(0, 150) + '...' || '',
            content: data.content || '',
            author: data.authorName || data.authorEmail || 'Unknown',
            date: data.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            category: data.category || 'Uncategorized',
            image: data.image || undefined
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching post:', error);
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-700">جاري التحميل...</p>
        </div>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">المنشور غير موجود</h1>
          <Link href="/Posts" className="text-blue-600 hover:underline">
            ← العودة للمنشورات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gray-300 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/Posts" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            ← العودة للمنشورات
          </Link>
          
          {/* Category Badge */}
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-sm font-semibold rounded-full mb-4">
            {post.category}
          </span>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-800 mb-4">
            {post.title}
          </h1>
          
          {/* Meta Info */}
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                {post.author.charAt(0)}
              </div>
              <span className="font-medium">{post.author}</span>
            </div>
            <span>•</span>
            <span>{new Date(post.date).toLocaleDateString('ar-EG', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
          
          {/* Main Image */}
          {post.image && (
            <div className="mt-8 rounded-xl overflow-hidden shadow-lg">
              <Image 
                src={post.image} 
                alt={post.title}
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          {/* Excerpt */}
          <p className="text-xl text-gray-700 leading-relaxed mb-8 font-medium border-l-4 border-blue-500 pl-6 italic">
            {post.excerpt}
          </p>
          
          {/* Main Content */}
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
            style={{
              lineHeight: '1.8',
            }}
          />
        </div>

        {/* زر العودة */}
        <div className="mt-12 text-center">
          <Link 
            href="/Posts"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            ← العودة لجميع المنشورات
          </Link>
        </div>
      </article>

      {/* Add custom styles for the content */}
      <style jsx global>{`
        .prose h2 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #1f2937;
        }
        .prose h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #374151;
        }
        .prose p {
          margin-bottom: 1.25rem;
          color: #4b5563;
        }
        .prose ul, .prose ol {
          margin-left: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .prose li {
          margin-bottom: 0.5rem;
          color: #4b5563;
        }
        .prose pre {
          background-color: #1f2937;
          color: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1.25rem;
        }
        .prose code {
          background-color: #f3f4f6;
          color: #dc2626;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .prose pre code {
          background-color: transparent;
          color: #f3f4f6;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
