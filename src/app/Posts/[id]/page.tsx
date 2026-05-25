"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import type { Post } from "@/types";

export default function PostDetailPage() {
  const { id } = useParams() as { id: string };
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then((d: { post?: Post; error?: string }) => {
        if (d.post) setPost(d.post);
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-40">
        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    </div>
  );

  if (notFound || !post) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto text-center py-40 px-4">
        <h1 className="text-4xl font-bold text-slate-700 mb-4">المقال غير موجود</h1>
        <Link href="/Posts" className="text-sky-600 hover:underline">← العودة للمقالات</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/Posts" className="text-sky-600 hover:underline text-sm mb-6 inline-block">
          ← العودة للمقالات
        </Link>

        <span className="inline-block text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full mb-4">
          {post.category}
        </span>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">{post.title}</h1>

        <div className="flex items-center gap-3 text-sm text-slate-500 mb-8 pb-8 border-b border-slate-200">
          <div className="w-8 h-8 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-sm">
            {post.authorName?.charAt(0) ?? "؟"}
          </div>
          <span>{post.authorName}</span>
        </div>

        {post.featuredImage && (
          <div className="rounded-2xl overflow-hidden mb-8 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.featuredImage} alt={post.title} className="w-full max-h-96 object-cover" />
          </div>
        )}

        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
}
