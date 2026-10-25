"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Download,
  Heart,
  LoaderCircle,
  LogIn,
  RefreshCw,
  Share2,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import type { Post } from "@/types";
import {
  isArticleSavedOffline,
  saveOfflineArticle,
} from "@/lib/offlineReading";

type LikeResponse = {
  success?: boolean;
  liked?: boolean;
  likesCount?: number;
  error?: string;
};

type FavoriteResponse = {
  success?: boolean;
  favorites?: Array<{ id: string }>;
  error?: string;
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();

  const id = typeof params.id === "string" ? params.id : "";

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);

  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [shareLoading, setShareLoading] = useState(false);

  // تحميل المقال من الخادم.
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadPost() {
      setLoading(true);
      setNotFound(false);

      try {
        const response = await fetch(
          `/api/posts/${encodeURIComponent(id)}`,
          { cache: "no-store" }
        );

        const data = (await response.json()) as {
          post?: Post;
          error?: string;
        };

        if (cancelled) return;

        if (!response.ok || !data.post) {
          setNotFound(true);
          setPost(null);
          return;
        }

        setPost(data.post);
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setPost(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPost();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // التحقق من حالة الإعجاب.
  const loadLikeStatus = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(id)}/like`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );

      const data = (await response.json()) as LikeResponse;

      if (!response.ok || !data.success) return;

      setLiked(Boolean(data.liked));
      setLikesCount(
        typeof data.likesCount === "number"
          ? data.likesCount
          : 0
      );
    } catch {
      // لا نمنع قراءة المقال إذا تعذر تحميل حالة الإعجاب.
    }
  }, [id]);

  // التحقق من وجود المقال في المفضلة.
  const loadFavoriteStatus = useCallback(async () => {
    if (!id || status !== "authenticated") {
      setFavorited(false);
      return;
    }

    try {
      const response = await fetch("/api/favorites", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        setFavorited(false);
        return;
      }

      const data = (await response.json()) as FavoriteResponse;

      if (!response.ok || !data.success) return;

      setFavorited(
        Array.isArray(data.favorites) &&
          data.favorites.some((favorite) => favorite.id === id)
      );
    } catch {
      // لا نمنع قراءة المقال إذا تعذر تحميل المفضلة.
    }
  }, [id, status]);

  // التحقق من الحفظ المحلي دون الاتصال بالخادم.
  const loadOfflineStatus = useCallback(async () => {
    if (!id) return;

    try {
      const saved = await isArticleSavedOffline(id);
      setOfflineSaved(saved);
    } catch {
      setOfflineSaved(false);
    }
  }, [id]);

  useEffect(() => {
    if (loading || notFound || !post) return;

    void loadLikeStatus();
  }, [loading, notFound, post, loadLikeStatus]);

  useEffect(() => {
    void loadFavoriteStatus();
  }, [loadFavoriteStatus]);

  useEffect(() => {
    void loadOfflineStatus();
  }, [loadOfflineStatus]);

  // إعادة المستخدم إلى تسجيل الدخول مع العودة للمقال بعد ذلك.
  const requireLogin = () => {
    const returnTo = `/Posts/${encodeURIComponent(id)}`;

    router.push(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  };

  // الإعجاب بالمقال أو إلغاء الإعجاب.
  const toggleLike = async () => {
    if (likeLoading) return;

    if (status !== "authenticated") {
      requireLogin();
      return;
    }

    setLikeLoading(true);
    setActionError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(id)}/like`,
        {
          method: "POST",
          headers: { Accept: "application/json" },
        }
      );

      const data = (await response.json()) as LikeResponse & {
        message?: string;
      };

      if (response.status === 401) {
        requireLogin();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تحديث الإعجاب.");
      }

      setLiked(Boolean(data.liked));

      setLikesCount(
        typeof data.likesCount === "number"
          ? data.likesCount
          : likesCount
      );

      setNotice(
        data.liked
          ? "أعجبك هذا المقال."
          : "ألغيت إعجابك بالمقال."
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث الإعجاب."
      );
    } finally {
      setLikeLoading(false);
    }
  };

  // إضافة المقال إلى المفضلة أو إزالته منها.
  const toggleFavorite = async () => {
    if (favoriteLoading) return;

    if (status !== "authenticated") {
      requireLogin();
      return;
    }

    setFavoriteLoading(true);
    setActionError("");
    setNotice("");

    try {
      const response = await fetch("/api/favorites", {
        method: favorited ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ postId: id }),
      });

      const data = (await response.json()) as FavoriteResponse;

      if (response.status === 401) {
        requireLogin();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            (favorited
              ? "تعذرت إزالة المقال من المفضلة."
              : "تعذرت إضافة المقال إلى المفضلة.")
        );
      }

      setFavorited((current) => !current);

      setNotice(
        favorited
          ? "أُزيل المقال من المفضلة."
          : "أُضيف المقال إلى المفضلة."
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث المفضلة."
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  // حفظ نسخة كاملة من المقال في IndexedDB.
  const saveArticleOffline = async () => {
    if (offlineLoading || !post) return;

    if (status !== "authenticated") {
      requireLogin();
      return;
    }

    setOfflineLoading(true);
    setActionError("");
    setNotice("");

    try {
      await saveOfflineArticle({
        id,
        title: post.title || "مقال من سين",
        excerpt: post.excerpt || "",
        content: post.content || "",
        authorName: post.authorName || "فريق التحرير",
        category: post.category || "",
        featuredImage: post.featuredImage || "",
      });

      setOfflineSaved(true);
      setNotice(
        "تم حفظ المقال على هذا الجهاز. يمكنك قراءته لاحقًا دون اتصال بالإنترنت."
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? `تعذر حفظ المقال دون اتصال: ${error.message}`
          : "تعذر حفظ المقال. تحقق من مساحة التخزين المتاحة وحاول مجددًا."
      );
    } finally {
      setOfflineLoading(false);
    }
  };

  // مشاركة رابط المقال.
  const shareArticle = async () => {
    setShareLoading(true);
    setActionError("");
    setNotice("");

    try {
      const url = window.location.href;

      if (navigator.share) {
        await navigator.share({
          title: post?.title || "مقال من سين",
          url,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setNotice("تم نسخ رابط المقال.");
      } else {
        setNotice("يمكنك نسخ رابط المقال من شريط العنوان.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setActionError("تعذرت مشاركة المقال.");
      }
    } finally {
      setShareLoading(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center py-40">
          <LoaderCircle
            size={42}
            className="animate-spin text-sky-700"
          />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-40 text-center">
          <h1 className="mb-4 text-3xl font-black text-slate-800">
            المقال غير موجود
          </h1>

          <p className="mb-6 text-sm leading-7 text-slate-500">
            ربما حُذف المقال أو لم يعد متاحًا للنشر.
          </p>

          <Link
            href="/Posts"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800"
          >
            <ArrowRight size={17} />
            العودة إلى المقالات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <Navbar />

      <main>
        <header className="relative overflow-hidden bg-sky-950">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
          />

          <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 lg:px-8">
            <div className="mb-8 flex justify-end">
              <Link
                href="/Posts"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-100/75 transition hover:text-white"
              >
                <ArrowRight size={17} />
                العودة إلى المقالات
              </Link>
            </div>

            {post.category && (
              <span className="mb-5 inline-flex rounded-full border border-sky-300/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-sky-200">
                {post.category}
              </span>
            )}

            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 max-w-3xl text-base leading-8 text-sky-100/75 sm:text-lg">
                {post.excerpt}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6 text-sm text-sky-100/80">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-black text-white">
                {post.authorName?.trim().charAt(0) || "؟"}
              </div>

              <div>
                <p className="font-bold text-white">
                  {post.authorName || "فريق التحرير"}
                </p>

                <p className="mt-1 text-xs text-sky-100/60">
                  من صحيفة سين
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
          {post.featuredImage && (
            <div className="-mt-5 overflow-hidden rounded-2xl border border-white bg-white shadow-xl shadow-slate-900/10 sm:-mt-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.featuredImage}
                alt={post.title}
                className="max-h-[520px] w-full object-cover"
              />
            </div>
          )}

          <section
            aria-label="التفاعل مع المقال"
            className="sticky top-20 z-20 mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-lg shadow-slate-900/5 backdrop-blur sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleLike()}
                  disabled={likeLoading || status === "loading"}
                  aria-pressed={liked}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    liked
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  }`}
                >
                  {likeLoading ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Heart
                      size={19}
                      className={liked ? "fill-current" : ""}
                    />
                  )}

                  <span>{liked ? "أعجبني" : "إعجاب"}</span>

                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-xs ${
                      liked
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {likesCount.toLocaleString("ar")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void toggleFavorite()}
                  disabled={favoriteLoading || status === "loading"}
                  aria-pressed={favorited}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    favorited
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  {favoriteLoading ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Bookmark
                      size={18}
                      className={favorited ? "fill-current" : ""}
                    />
                  )}

                  {favorited ? "في المفضلة" : "إضافة للمفضلة"}
                </button>

                <button
                  type="button"
                  onClick={() => void saveArticleOffline()}
                  disabled={
                    offlineLoading ||
                    offlineSaved ||
                    status === "loading"
                  }
                  aria-label={
                    offlineSaved
                      ? "المقال محفوظ للقراءة دون اتصال"
                      : "حفظ المقال للقراءة دون اتصال"
                  }
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                    offlineSaved
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300 hover:bg-sky-100"
                  }`}
                >
                  {offlineLoading ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : offlineSaved ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Download size={18} />
                  )}

                  <span>
                    {offlineLoading
                      ? "جارٍ الحفظ..."
                      : offlineSaved
                        ? "محفوظ دون اتصال"
                        : "حفظ دون اتصال"}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void shareArticle()}
                disabled={shareLoading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-60"
              >
                {shareLoading ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Share2 size={17} />
                )}

                <span className="hidden sm:inline">مشاركة</span>
              </button>
            </div>

            {status === "unauthenticated" && (
              <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs leading-6 text-slate-500">
                <LogIn size={15} className="shrink-0 text-sky-700" />

                سجّل الدخول للإعجاب بالمقالات وحفظها في المفضلة أو للقراءة دون اتصال.

                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/Posts/${id}`)}`}
                  className="shrink-0 font-bold text-sky-700 hover:text-sky-900"
                >
                  تسجيل الدخول
                </Link>
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-800"
              >
                {notice}
              </p>
            )}

            {actionError && (
              <div
                role="alert"
                className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-700"
              >
                <span>{actionError}</span>

                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    void loadLikeStatus();
                    void loadFavoriteStatus();
                    void loadOfflineStatus();
                  }}
                  className="inline-flex shrink-0 items-center gap-1 font-bold"
                >
                  <RefreshCw size={14} />
                  إعادة المحاولة
                </button>
              </div>
            )}
          </section>

          <article className="mt-8 rounded-2xl border border-slate-200/70 bg-white px-5 py-8 shadow-sm sm:px-9 sm:py-10">
            <div
              className="prose prose-slate max-w-none text-base leading-8 prose-headings:font-black prose-headings:leading-tight prose-a:text-sky-700 prose-img:rounded-xl sm:text-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </article>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <h2 className="font-black text-slate-900">
                هل تريد العودة إلى هذا المقال؟
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                أضفه إلى المفضلة لتجده بسهولة لاحقًا، أو احفظه للقراءة دون اتصال.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleFavorite()}
                disabled={favoriteLoading || status === "loading"}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-800 disabled:opacity-60"
              >
                <Bookmark
                  size={17}
                  className={favorited ? "fill-current" : ""}
                />

                {favorited ? "إزالة من المفضلة" : "حفظ المقال"}
              </button>

              <button
                type="button"
                onClick={() => void saveArticleOffline()}
                disabled={
                  offlineLoading ||
                  offlineSaved ||
                  status === "loading"
                }
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition disabled:opacity-70 ${
                  offlineSaved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                }`}
              >
                {offlineLoading ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : offlineSaved ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <Download size={17} />
                )}

                {offlineSaved ? "محفوظ دون اتصال" : "حفظ دون اتصال"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}