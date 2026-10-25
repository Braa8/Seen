"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Download,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import {
  deleteOfflineArticle,
  getOfflineArticles,
  type OfflineArticle,
} from "@/lib/offlineReading";

export default function OfflineReadingPage() {
  const [articles, setArticles] = useState<OfflineArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const savedArticles = await getOfflineArticles();
      setArticles(savedArticles);
    } catch {
      setError(
        "تعذر الوصول إلى المقالات المحفوظة على هذا الجهاز. حاول تحديث الصفحة."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const handleDelete = async (article: OfflineArticle) => {
    const confirmed = window.confirm(
      `هل تريد حذف «${article.title}» من المقالات المحفوظة على هذا الجهاز؟`
    );

    if (!confirmed || deletingId) return;

    setDeletingId(article.id);
    setError("");
    setNotice("");

    try {
      await deleteOfflineArticle(article.id);

      setArticles((current) =>
        current.filter((item) => item.id !== article.id)
      );

      setNotice("تم حذف المقال من المحفوظات المحلية.");
    } catch {
      setError("تعذر حذف المقال. حاول مرة أخرى.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f6f8fb] text-slate-900"
    >
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="relative mb-8 overflow-hidden rounded-3xl bg-sky-950 px-6 py-8 text-white shadow-xl shadow-sky-950/10 sm:px-10 sm:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl"
          />

          <div className="relative">
            <Link
              href="/Posts"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-sky-100/75 transition hover:text-white"
            >
              <ArrowRight size={17} />
              العودة إلى المقالات
            </Link>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                <BookOpen size={27} />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold tracking-widest text-sky-300">
                  SEEN · OFFLINE READING
                </p>

                <h1 className="text-3xl font-black sm:text-4xl">
                  القراءة دون اتصال
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/75 sm:text-base">
                  مقالاتك المحفوظة في مكان واحد، لتعود إليها وتقرأها
                  حتى عندما لا يتوفر اتصال بالإنترنت.
                </p>
              </div>
            </div>

            {!loading && !error && (
              <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm">
                <Download size={17} className="text-sky-300" />
                <span>
                  {articles.length.toLocaleString("ar")} مقال محفوظ
                </span>
              </div>
            )}
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
          >
            {error}

            <button
              type="button"
              onClick={() => void loadArticles()}
              className="mr-3 font-bold underline underline-offset-4"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white">
            <LoaderCircle
              size={35}
              className="animate-spin text-sky-800"
            />

            <p className="text-sm text-slate-500">
              جارٍ تحميل المقالات المحفوظة...
            </p>
          </div>
        ) : !error && articles.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-800">
              <BookOpen size={30} />
            </div>

            <h2 className="mt-6 text-xl font-black text-slate-900">
              مكتبتك المحلية فارغة حاليًا
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
              عندما تجد مقالًا تريد قراءته لاحقًا، افتحه واضغط على
              «حفظ دون اتصال». سيظهر هنا لتتمكن من الوصول إليه بسهولة.
            </p>

            <Link
              href="/Posts"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800"
            >
              <ArrowRight size={17} />
              استكشف المقالات
            </Link>
          </section>
        ) : !error ? (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  مكتبتك المحفوظة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  اختر مقالًا لقراءته أو احذفه لتوفير مساحة.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {articles.map((article) => (
                <article
                  key={article.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-900/5"
                >
                  {article.featuredImage ? (
                    <Link
                      href={`/OfflineReading/${encodeURIComponent(article.id)}`}
                      aria-label={`قراءة ${article.title}`}
                      className="block overflow-hidden bg-slate-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        loading="lazy"
                        className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    </Link>
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-gradient-to-br from-sky-950 to-slate-800 text-white">
                      <BookOpen size={35} className="opacity-70" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    {article.category && (
                      <span className="mb-3 w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
                        {article.category}
                      </span>
                    )}

                    <Link
                      href={`/OfflineReading/${encodeURIComponent(article.id)}`}
                      className="text-lg font-black leading-8 text-slate-900 transition hover:text-sky-800"
                    >
                      {article.title}
                    </Link>

                    {article.excerpt && (
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">
                        {article.excerpt}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen size={14} />
                        {article.authorName || "فريق التحرير"}
                      </span>

                      <span aria-hidden="true">•</span>

                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} />
                        {formatDate(article.savedAt)}
                      </span>
                    </div>

                    <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
                      <Link
                        href={`/OfflineReading/${encodeURIComponent(article.id)}`}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-800"
                      >
                        <BookOpen size={16} />
                        قراءة المقال
                      </Link>

                      <button
                        type="button"
                        onClick={() => void handleDelete(article)}
                        disabled={deletingId === article.id}
                        aria-label={`حذف ${article.title}`}
                        title="حذف من المحفوظات"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                      >
                        {deletingId === article.id ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-8 text-center text-xs leading-6 text-slate-400">
          تُحفظ المقالات على هذا الجهاز وفي هذا المتصفح، ولا تتم مزامنتها
          تلقائيًا مع الأجهزة الأخرى.
        </p>
      </main>
    </div>
  );
}