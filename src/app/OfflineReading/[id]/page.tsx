"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  getOfflineArticle,
  type OfflineArticle,
} from "@/lib/offlineReading";
import Image from "next/image";

export default function OfflineArticlePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [article, setArticle] = useState<OfflineArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArticle() {
      if (!id) {
        setArticle(null);
        setError("لم يتم تحديد المقال المطلوب.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const savedArticle = await getOfflineArticle(
          decodeURIComponent(id)
        );

        if (cancelled) return;

        if (!savedArticle) {
          setArticle(null);
          setError(
            "هذا المقال غير موجود في المقالات المحفوظة على هذا الجهاز."
          );
          return;
        }

        setArticle(savedArticle);
      } catch {
        if (cancelled) return;

        setArticle(null);
        setError(
          "تعذّر استرجاع المقال المحفوظ. حاول تحديث الصفحة."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadArticle();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="mx-auto min-h-screen max-w-4xl px-5 py-16"
      >
        <div className="animate-pulse space-y-5">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-10 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-64 rounded-2xl bg-gray-200" />
          <div className="space-y-3">
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          جارٍ تحميل المقال المحفوظ...
        </p>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[70vh] items-center justify-center px-5 py-16"
      >
        <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl">
            📖
          </div>

          <h1 className="mb-3 text-2xl font-bold text-gray-900">
            المقال غير متاح
          </h1>

          <p className="mb-7 leading-8 text-gray-600">
            {error ||
              "تعذّر العثور على المقال المطلوب ضمن المقالات المحفوظة."}
          </p>

          <Link
            href="/OfflineReading"
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 font-medium text-white transition hover:bg-gray-700"
          >
            العودة إلى المقالات المحفوظة
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#faf9f6] px-4 py-8 text-gray-900 sm:px-6 sm:py-12"
    >
      <article className="mx-auto max-w-4xl">
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/OfflineReading"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950"
          >
            <span aria-hidden="true">→</span>
            المقالات المحفوظة
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            وضع القراءة دون اتصال
          </span>
        </nav>

        <header className="mb-8 border-b border-gray-200 pb-8">
          {article.category && (
            <p className="mb-4 text-sm font-semibold text-emerald-700">
              {article.category}
            </p>
          )}

          <h1 className="mb-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl sm:leading-tight lg:text-5xl">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="mb-6 text-lg leading-9 text-gray-600">
              {article.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
            {article.authorName && (
              <span>
                بقلم{" "}
                <span className="font-medium text-gray-800">
                  {article.authorName}
                </span>
              </span>
            )}

            {article.savedAt && (
              <span>
                حُفظ في{" "}
                {new Date(article.savedAt).toLocaleDateString("ar", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </header>

        {article.featuredImage && (
          <div className="mb-10 overflow-hidden rounded-2xl bg-gray-100">
            <Image
              src={article.featuredImage}
              alt={article.title}
              className="max-h-[520px] w-full object-cover"
            />
          </div>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white px-5 py-8 shadow-sm sm:px-10 sm:py-12">
          {article.content ? (
            <div
              className="offline-article-content text-base leading-9 text-gray-800 sm:text-lg sm:leading-10"
              dangerouslySetInnerHTML={{
                __html: article.content,
              }}
            />
          ) : (
            <p className="text-center leading-8 text-gray-500">
              لا يوجد محتوى محفوظ لهذا المقال.
            </p>
          )}
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500">
            أنت تقرأ نسخة محفوظة على جهازك.
          </p>

          <Link
            href="/OfflineReading"
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-100"
          >
            العودة للقائمة
          </Link>
        </footer>
      </article>

      <style jsx global>{`
        .offline-article-content {
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .offline-article-content p {
          margin-bottom: 1.5rem;
        }

        .offline-article-content h1,
        .offline-article-content h2,
        .offline-article-content h3,
        .offline-article-content h4 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 700;
          line-height: 1.6;
          color: #111827;
        }

        .offline-article-content h1 {
          font-size: 1.875rem;
        }

        .offline-article-content h2 {
          font-size: 1.5rem;
        }

        .offline-article-content h3 {
          font-size: 1.25rem;
        }

        .offline-article-content ul,
        .offline-article-content ol {
          margin: 1.25rem 0;
          padding-right: 1.75rem;
        }

        .offline-article-content ul {
          list-style-type: disc;
        }

        .offline-article-content ol {
          list-style-type: decimal;
        }

        .offline-article-content li {
          margin-bottom: 0.5rem;
        }

        .offline-article-content img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 1.75rem auto;
          border-radius: 0.75rem;
        }

        .offline-article-content blockquote {
          margin: 1.75rem 0;
          border-right: 4px solid #059669;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          color: #4b5563;
        }

        .offline-article-content a {
          color: #047857;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .offline-article-content table {
          display: block;
          max-width: 100%;
          overflow-x: auto;
          border-collapse: collapse;
        }

        .offline-article-content th,
        .offline-article-content td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
        }

        .offline-article-content pre {
          max-width: 100%;
          overflow-x: auto;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          border-radius: 0.75rem;
          background: #f3f4f6;
          padding: 1rem;
        }
      `}</style>
    </main>
  );
}