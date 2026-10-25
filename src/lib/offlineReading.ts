export interface OfflineArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  authorName: string;
  category: string;
  featuredImage: string;
  savedAt: number;
  originalUrl: string;
}

const DB_NAME = "seen-offline-reading";
const DB_VERSION = 1;
const STORE_NAME = "articles";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("التخزين المحلي غير مدعوم في هذا المتصفح."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("تعذر فتح قاعدة التخزين المحلي."));

    request.onblocked = () =>
      reject(new Error("أغلق علامات التبويب الأخرى للموقع ثم أعد المحاولة."));
  });
}

export async function saveOfflineArticle(
  article: Omit<OfflineArticle, "savedAt" | "originalUrl">,
): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      store.put({
        ...article,
        savedAt: Date.now(),
        originalUrl: `/Posts/${encodeURIComponent(article.id)}`,
      } satisfies OfflineArticle);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("تعذر حفظ المقال."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("أُلغيت عملية حفظ المقال."));
    });
  } finally {
    database.close();
  }
}

export async function getOfflineArticles(): Promise<OfflineArticle[]> {
  const database = await openDatabase();

  try {
    return await new Promise<OfflineArticle[]>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => {
        const articles = request.result as OfflineArticle[];

        resolve(
          articles.sort((a, b) => b.savedAt - a.savedAt),
        );
      };

      request.onerror = () =>
        reject(request.error ?? new Error("تعذر قراءة المقالات المحفوظة."));
    });
  } finally {
    database.close();
  }
}

export async function getOfflineArticle(
  id: string,
): Promise<OfflineArticle | null> {
  const database = await openDatabase();

  try {
    return await new Promise<OfflineArticle | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(id);

      request.onsuccess = () =>
        resolve((request.result as OfflineArticle | undefined) ?? null);

      request.onerror = () =>
        reject(request.error ?? new Error("تعذر فتح المقال المحفوظ."));
    });
  } finally {
    database.close();
  }
}

export async function deleteOfflineArticle(id: string): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("تعذر حذف المقال."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("أُلغيت عملية الحذف."));
    });
  } finally {
    database.close();
  }
}

export async function isArticleSavedOffline(id: string): Promise<boolean> {
  const database = await openDatabase();

  try {
    return await new Promise<boolean>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).count(IDBKeyRange.only(id));

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () =>
        reject(request.error ?? new Error("تعذر التحقق من المقال المحفوظ."));
    });
  } finally {
    database.close();
  }
}