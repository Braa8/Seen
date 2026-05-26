import Link from "next/link";
import Navbar from "@/components/Navbar";
import { adminDb } from "@/lib/firebaseAdmin";
import Image from "next/image";

async function getRecentPosts() {
  try {
    const snap = await adminDb.collection("posts")
      .where("status", "==", "published")
      .orderBy("createdAt", "desc")
      .limit(6)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title as string,
        excerpt: data.excerpt as string,
        category: data.category as string,
        authorName: data.authorName as string,
        featuredImage: data.featuredImage as string,
      };
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const posts = await getRecentPosts();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-950 via-sky-900 to-sky-950 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-col justify-center items-center m-3">
            <Image
             src="/logo.png" 
             alt="سين" 
             width={200}
             height={100} />
          </div>
          <p className="text-xl md:text-2xl text-sky-200 mb-4">لأن الصحافة سؤال</p>
          <p className="text-sky-300 mb-10 max-w-lg mx-auto">
            منصة صحفية عربية تجمع الكتّاب والمحررين والقراء في فضاء واحد
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/Posts"
              className="px-8 py-3 bg-white text-sky-800 rounded-full font-bold hover:bg-sky-50 transition-all hover:scale-105 shadow-lg">
              اقرأ المقالات
            </Link>
            <Link href="/register"
              className="px-8 py-3 border-2 border-white text-white rounded-full font-bold hover:bg-white/10 transition-all hover:scale-105">
              انضم إلينا
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold text-slate-800">أحدث المقالات</h2>
          <Link href="/Posts" className="text-sky-600 hover:text-sky-700 font-medium">
            عرض الكل ←
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-2xl mb-2">لا توجد مقالات حتى الآن</p>
            <p>كن أول من يكتب!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/Posts/${post.id}`}>
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-100 overflow-hidden transition-all hover:-translate-y-1 duration-300 h-full">
                  {post.featuredImage && (
                    <div className="h-48 bg-slate-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-6">
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">
                      {post.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 mt-3 mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-slate-500 text-sm line-clamp-3">{post.excerpt}</p>
                    <p className="text-xs text-slate-400 mt-4">{post.authorName}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16 py-8 text-center text-slate-500 text-sm">
        <p>سين © {new Date().getFullYear()} — لأن الصحافة سؤال</p>
      </footer>
    </div>
  );
}
