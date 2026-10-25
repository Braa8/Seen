"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CalendarDays,
  Heart,
  LoaderCircle,
  LogIn,
  Newspaper,
  RefreshCw,
  Trash2,
} from "lucide-react";

type FavoritePost = {
  id: string;
  title?: string;
  headline?: string;
  excerpt?: string;
  summary?: string;
  description?: string;
  category?: string;
  authorName?: string;
  displayName?: string;
  savedAt?: unknown;
  content?: string;
  [key: string]: unknown;
};

type ApiResponse = {
  success?: boolean;
  favorites?: FavoritePost[];
  error?: string;
  hasMore?: boolean;
};

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getPostTitle(post: FavoritePost): string {
  return (
    getText(post.title) ||
    getText(post.headline) ||
    "مقال بلا عنوان"
  );
}

function getPostDescription(post: FavoritePost): string {
  const description =
    getText(post.excerpt) ||
    getText(post.summary) ||
    getText(post.description);

  if (description) return description;

  // استخراج نص تقريبي من HTML لعرض مقتطف فقط.
  const content = getText(post.content)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (!content) {
    return "افتح المقال للاطلاع على التفاصيل.";
  }

  return content.length > 170
    ? `${content.slice(0, 170)}…`
    : content;
}

function getSavedDate(value: unknown): string {
  if (!value) return "";

  let date: Date;

  if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    date = new Date(value.seconds * 1000);
  } else {
    return "";
  }

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoritePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError("");
    setUnauthorized(false);
    setNotice("");

    try {
      const response = await fetch("/api/favorites", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const data = (await response.json()) as ApiResponse;

      if (response.status === 401) {
        setUnauthorized(true);
        setFavorites([]);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "تعذر تحميل المقالات المفضلة."
        );
      }

      setFavorites(
        Array.isArray(data.favorites) ? data.favorites : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل المفضلة."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const removeFavorite = async (postId: string) => {
    if (removingId) return;

    setRemovingId(postId);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/favorites", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ postId }),
      });

      const data = (await response.json()) as ApiResponse;

      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "تعذرت إزالة المقال من المفضلة."
        );
      }

      setFavorites((current) =>
        current.filter((post) => post.id !== postId)
      );

      setNotice("تمت إزالة المقال من المفضلة.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء إزالة المقال."
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f6f8fb] text-slate-900"
    >
      {/* Header */}
      <section className="relative overflow-hidden bg-sky-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-1/4 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Link
            href="/Posts"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-sky-100/75 transition hover:text-white"
          >
            <ArrowRight size={17} />
            العودة إلى المقالات
          </Link>

          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-rose-300 shadow-lg sm:h-16 sm:w-16">
              <Heart size={30} strokeWidth={1.8} />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.18em] text-sky-300">
                مكتبتك الشخصية
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                مقالاتي المفضلة
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-7 text-sky-100/70 sm:text-base">
                مساحة تجمع المقالات التي تستحق العودة إليها،
                لتجدها بسهولة في أي وقت.
              </p>
            </div>
          </div>

          {!loading && !unauthorized && (
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-sky-100/85">
              <Bookmark size={16} />
              {favorites.length}{" "}
              {favorites.length === 1
                ? "مقال محفوظ"
                : "مقالات محفوظة"}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {notice && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm leading-6 text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => void loadFavorites()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
            >
              <RefreshCw size={16} />
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm">
            <LoaderCircle
              size={34}
              className="animate-spin text-sky-700"
            />

            <p className="mt-4 text-sm font-semibold text-slate-600">
              جارٍ تحميل مقالاتك المفضلة...
            </p>
          </div>
        ) : unauthorized ? (
          <div className="mx-auto flex min-h-80 max-w-xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <LogIn size={30} />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              سجّل الدخول للوصول إلى مكتبتك
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
              سجّل الدخول إلى حسابك في سين لعرض المقالات التي
              أضفتها إلى المفضلة.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/10 transition hover:bg-sky-800"
            >
              تسجيل الدخول
              <ArrowRight size={17} />
            </Link>

            <Link
              href="/register"
              className="mt-4 text-sm font-semibold text-sky-700 transition hover:text-sky-900"
            >
              ليس لديك حساب؟ أنشئ حساباً
            </Link>
          </div>
        ) : favorites.length === 0 ? (
          <div className="mx-auto flex min-h-80 max-w-xl flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <Heart size={30} />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              مكتبتك تبدأ من هنا
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
              لم تحفظ أي مقال بعد. تصفّح مقالات سين وأضف ما
              يعجبك إلى المفضلة لتعود إليه بسهولة.
            </p>

            <Link
              href="/Posts"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/10 transition hover:bg-sky-800"
            >
              <Newspaper size={18} />
              اكتشف المقالات
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  مجموعتك المحفوظة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  مقالات اخترتها لتعود إليها لاحقاً.
                </p>
              </div>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500">
                {favorites.length} مقال
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {favorites.map((post) => {
                const title = getPostTitle(post);
                const description = getPostDescription(post);
                const category = getText(post.category);
                const author =
                  getText(post.authorName) ||
                  getText(post.displayName);
                const savedDate = getSavedDate(post.savedAt);
                const isRemoving = removingId === post.id;

                return (
                  <article
                    key={post.id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60"
                  >
                    <div className="relative flex h-36 items-center justify-between overflow-hidden bg-gradient-to-br from-sky-950 via-sky-900 to-slate-800 p-5">
                      <div
                        aria-hidden="true"
                        className="absolute -left-6 -top-10 h-36 w-36 rounded-full border border-white/10"
                      />

                      <div
                        aria-hidden="true"
                        className="absolute -left-1 top-4 h-24 w-24 rounded-full border border-white/10"
                      />

                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-sky-200">
                        <BookOpen size={24} />
                      </div>

                      {category && (
                        <span className="relative max-w-[65%] truncate rounded-full border border-white/15 bg-black/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                          {category}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => void removeFavorite(post.id)}
                        disabled={Boolean(removingId)}
                        aria-label={`إزالة ${title} من المفضلة`}
                        title="إزالة من المفضلة"
                        className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/80 backdrop-blur-sm transition hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRemoving ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-black leading-8 text-slate-900 transition group-hover:text-sky-800">
                        {title}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">
                        {description}
                      </p>

                      {(author || savedDate) && (
                        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
                          {author && (
                            <span className="truncate font-medium text-slate-500">
                              بقلم {author}
                            </span>
                          )}

                          {savedDate && (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays size={14} />
                              حُفظ في {savedDate}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                        <Link
                          href={`/Posts/${encodeURIComponent(post.id)}`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-800"
                        >
                          قراءة المقال
                          <ArrowRight size={16} />
                        </Link>

                        <button
                          type="button"
                          onClick={() => void removeFavorite(post.id)}
                          disabled={Boolean(removingId)}
                          aria-label={`إزالة ${title} من المفضلة`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isRemoving ? (
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
                );
              })}
            </div>

            <p className="mt-8 text-center text-xs leading-6 text-slate-400">
              تُحفظ مقالاتك المفضلة في حسابك لتتمكن من الوصول إليها
              عند تسجيل الدخول من أجهزتك المختلفة.
            </p>
          </>
        )}
      </section>
    </main>
  );
}