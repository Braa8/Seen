"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import type { Post } from "@/types";

const CATEGORIES = ["الكل", "رأي", "تقنية", "سياسة", "اقتصاد", "رياضة", "ثقافة", "أخبار", "تحقيقات", "تعليم"];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");

  useEffect(() => {
    fetch("/api/posts?status=published&limit=50")
      .then((r) => r.json())
      .then((d: { posts?: Post[] }) => { setPosts(d.posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = posts.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
    const matchCat = category === "الكل" || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-slate-800 mb-8">المقالات</h1>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            type="text" placeholder="ابحث..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition ${category === c ? "bg-sky-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-sky-300"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">لا توجد مقالات</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <Link key={post.id} href={`/Posts/${post.id}`}>
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-100 overflow-hidden transition-all hover:-translate-y-1 duration-300 h-full">
                  {post.featuredImage && (
                    <div className="h-44 bg-slate-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">{post.category}</span>
                    <h3 className="text-base font-bold text-slate-800 mt-3 mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-slate-500 text-sm line-clamp-3">{post.excerpt}</p>
                    <p className="text-xs text-slate-400 mt-4">{post.authorName}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
