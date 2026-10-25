"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  Eraser,
  Lightbulb,
  RotateCcw,
  Trophy,
  Zap,
  Sparkles,
  Star,
  CheckCircle2,
} from "lucide-react";

type Difficulty = "easy" | "medium" | "hard";
type Puzzle = {
  date: string;
  size: number;
  difficulty: Difficulty;
  numbers: Record<number, number>;
  solution: number[];
};
type Saved = { path: number[]; seconds: number; hints: number };

const SETTINGS: Record<
  Difficulty,
  { size: number; label: string; clues: number }
> = {
  easy: { size: 5, label: "سهل", clues: 8 },
  medium: { size: 6, label: "متوسط", clues: 9 },
  hard: { size: 7, label: "صعب", clues: 10 },
};
const DAY_MS = 86400000;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function randomGenerator(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function neighbors(index: number, size: number): number[] {
  const row = Math.floor(index / size),
    col = index % size;
  return [
    row > 0 ? index - size : -1,
    col < size - 1 ? index + 1 : -1,
    row < size - 1 ? index + size : -1,
    col > 0 ? index - 1 : -1,
  ].filter((n) => n >= 0);
}
function makeSnake(size: number): number[] {
  const cells: number[] = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) for (let c = 0; c < size; c++) cells.push(r * size + c);
    else for (let c = size - 1; c >= 0; c--) cells.push(r * size + c);
  }
  return cells;
}
/** Full-grid paths are made by rotating / reflecting a valid Hamiltonian snake.
 * All produced boards are therefore guaranteed to have at least one solution. */
function makePuzzle(date: string): Puzzle {
  const day = Math.floor(Date.parse(date + "T00:00:00Z") / DAY_MS);
  const level: Difficulty = (["easy", "medium", "hard"] as Difficulty[])[
    hashString("difficulty:" + day) % 3
  ];
  const { size, clues } = SETTINGS[level];
  const rng = randomGenerator(hashString("puzzle:" + date));
  const snake = makeSnake(size);
  const rotation = Math.floor(rng() * 4);
  const flip = rng() < 0.5;
  const solution = snake.map((cell) => {
    let r = Math.floor(cell / size),
      c = cell % size;
    if (flip) c = size - 1 - c;
    for (let i = 0; i < rotation; i++) {
      const oldR = r;
      r = c;
      c = size - 1 - oldR;
    }
    return r * size + c;
  });
  if (rng() < 0.5) solution.reverse();
  const positions = new Set<number>([0, solution.length - 1]);
  const spacing = (solution.length - 1) / (clues - 1);
  for (let i = 1; i < clues - 1; i++) {
    const target = Math.round(i * spacing + (rng() - 0.5) * spacing * 0.55);
    positions.add(Math.max(1, Math.min(solution.length - 2, target)));
  }
  // Ensure the requested number of clues even if rounded positions collide.
  for (let i = 1; positions.size < clues && i < solution.length - 1; i++)
    positions.add(i);
  const numbers: Record<number, number> = {};
  [...positions]
    .sort((a, b) => a - b)
    .forEach((position, i) => {
      numbers[solution[position]] = i + 1;
    });
  return { date, size, difficulty: level, numbers, solution };
}
function timeLabel(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function isValidPath(path: number[], puzzle: Puzzle): boolean {
  if (
    !Array.isArray(path) ||
    !path.length ||
    path.length > puzzle.size ** 2 ||
    path[0] !== puzzle.solution[0]
  )
    return false;
  const seen = new Set<number>();
  let expected = 1;
  for (let i = 0; i < path.length; i++) {
    const cell = path[i];
    if (
      !Number.isInteger(cell) ||
      cell < 0 ||
      cell >= puzzle.size ** 2 ||
      seen.has(cell)
    )
      return false;
    if (i && !neighbors(path[i - 1], puzzle.size).includes(cell)) return false;
    seen.add(cell);
    const clue = puzzle.numbers[cell];
    if (clue !== undefined) {
      if (clue !== expected) return false;
      expected++;
    }
  }
  return true;
}
export default function PuzzlePage() {
  const [date, setDate] = useState<string | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [hints, setHints] = useState(0);
  const [notice, setNotice] = useState("");
  const drawing = useRef(false);
  const [celebrating, setCelebrating] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const hasCelebrated = useRef(false);
  const puzzle = useMemo(() => (date ? makePuzzle(date) : null), [date]);
  const storageKey = date ? `seen-zip-v1:${date}` : "";
  const completed =
    !!puzzle &&
    path.length === puzzle.size * puzzle.size &&
    isValidPath(path, puzzle);
  const visitedNumbers = puzzle
    ? path.reduce(
        (n, cell) => n + (puzzle.numbers[cell] !== undefined ? 1 : 0),
        0,
      )
    : 0;

  useEffect(() => {
    const update = () => setDate(utcDay());
    update();
    const id = window.setInterval(update, 15000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!puzzle) return;
    let saved: Saved | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw) as Saved;
    } catch {
      /* Storage may be unavailable. */
    }
    setPath(
      saved && isValidPath(saved.path, puzzle)
        ? saved.path
        : [puzzle.solution[0]],
    );
    setSeconds(
      saved && Number.isSafeInteger(saved.seconds) && saved.seconds >= 0
        ? saved.seconds
        : 0,
    );
    setHints(
      saved && Number.isSafeInteger(saved.hints) && saved.hints >= 0
        ? saved.hints
        : 0,
    );
    setNotice("");
    hasCelebrated.current = false;
    setCelebrating(false);
    setShowVictory(false);
  }, [puzzle, storageKey]);
  useEffect(() => {
    if (!puzzle || !path.length) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ path, seconds, hints } satisfies Saved),
      );
    } catch {
      /* Private browsing may block storage. */
    }
  }, [path, seconds, hints, puzzle, storageKey]);
  useEffect(() => {
    if (!puzzle || completed || path.length <= 1) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [puzzle, completed, path.length]);

  useEffect(() => {
    if (!completed || hasCelebrated.current) return;
    hasCelebrated.current = true;
    setCelebrating(true);
    setShowVictory(true);
    const timer = window.setTimeout(() => setCelebrating(false), 6500);
    return () => window.clearTimeout(timer);
  }, [completed]);

  const moveTo = useCallback(
    (cell: number) => {
      if (!puzzle || completed) return;
      setPath((previous) => {
        if (!previous.length) return [puzzle.solution[0]];
        const last = previous[previous.length - 1];
        if (cell === last) return previous;
        const priorIndex = previous.indexOf(cell);
        if (priorIndex >= 0) {
          // Dragging back along an existing path removes the later segments.
          if (priorIndex === previous.length - 2) return previous.slice(0, -1);
          return previous;
        }
        if (!neighbors(last, puzzle.size).includes(cell)) return previous;
        const clue = puzzle.numbers[cell];
        const expected =
          previous.reduce(
            (n, v) => n + (puzzle.numbers[v] !== undefined ? 1 : 0),
            0,
          ) + 1;
        if (clue !== undefined && clue !== expected) return previous;
        return [...previous, cell];
      });
      setNotice("");
    },
    [puzzle, completed],
  );

  useEffect(() => {
    const track = (event: PointerEvent) => {
      if (!drawing.current) return;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const target = element?.closest<HTMLElement>("[data-zip-cell]");
      if (target) {
        const cell = Number(target.dataset.zipCell);
        if (Number.isInteger(cell)) moveTo(cell);
      }
    };
    const stop = () => {
      drawing.current = false;
    };
    window.addEventListener("pointermove", track);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [moveTo]);

  const reset = () => {
    if (!puzzle) return;
    setPath([puzzle.solution[0]]);
    setSeconds(0);
    setHints(0);
    setNotice("");
    setCelebrating(false);
    setShowVictory(false);
    hasCelebrated.current = false;
  };
  const hint = () => {
    if (!puzzle || completed) return;
    const index = path.length;
    // A hint is available only while following the generated solution path.
    if (
      path.every((cell, i) => cell === puzzle.solution[i]) &&
      index < puzzle.solution.length
    ) {
      moveTo(puzzle.solution[index]);
      setHints((n) => n + 1);
      setNotice("أضفنا الخانة التالية إلى المسار.");
    } else {
      setNotice(
        "للحصول على تلميح، تراجع حتى تعود إلى المسار الصحيح، أو أعد المحاولة.",
      );
    }
  };
  const getSegment = (cell: number) => {
    if (!puzzle)
      return { top: false, right: false, bottom: false, left: false };
    const i = path.indexOf(cell);
    const adjacent = [
      i > 0 ? path[i - 1] : -1,
      i < path.length - 1 ? path[i + 1] : -1,
    ];
    return {
      top: adjacent.includes(cell - puzzle.size),
      right:
        adjacent.includes(cell + 1) && cell % puzzle.size < puzzle.size - 1,
      bottom: adjacent.includes(cell + puzzle.size),
      left: adjacent.includes(cell - 1) && cell % puzzle.size > 0,
    };
  };
  if (!puzzle)
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center text-slate-600"
      >
        جارٍ تجهيز مسار اليوم...
      </main>
    );
  const total = puzzle.size * puzzle.size;
  const maxNumber = Object.keys(puzzle.numbers).length;
  const level = SETTINGS[puzzle.difficulty];
  const progress = Math.round((path.length / total) * 100);
  const difficultyTone =
    puzzle.difficulty === "easy"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : puzzle.difficulty === "medium"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-rose-700 bg-rose-50 border-rose-200";
  const confetti = Array.from({ length: 85 }, (_, i) => ({
    left: `${(i * 37.37 + 11) % 100}%`,
    delay: `${(i * 0.13) % 2.1}s`,
    duration: `${3 + (i % 6) * 0.45}s`,
    color: ["#0d9488", "#fbbf24", "#fb7185", "#38bdf8", "#a78bfa", "#34d399"][
      i % 6
    ],
    rotation: `${(i * 73) % 360}deg`,
  }));
  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[#f4f7f9] px-3 pb-14 pt-8 text-slate-900 sm:px-6 sm:pt-12"
    >
      <style jsx global>{`
        @keyframes seen-confetti-fall {
          0% {
            transform: translate3d(0, -18vh, 0) rotate(0);
            opacity: 1;
          }
          100% {
            transform: translate3d(60px, 110vh, 0) rotate(820deg);
            opacity: 0;
          }
        }
        @keyframes seen-pop {
          0% {
            transform: translateY(35px) scale(0.78);
            opacity: 0;
          }
          65% {
            transform: translateY(-6px) scale(1.04);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes seen-glow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.3);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(20, 184, 166, 0);
          }
        }
        @keyframes seen-shine {
          from {
            background-position: 200% center;
          }
          to {
            background-position: -200% center;
          }
        }
        .seen-win-pop {
          animation: seen-pop 0.65s cubic-bezier(0.2, 0.9, 0.2, 1.15) both;
        }
        .seen-win-glow {
          animation: seen-glow 1.6s ease-in-out 3;
        }
        @media (prefers-reduced-motion: reduce) {
          .seen-win-pop,
          .seen-win-glow,
          .seen-confetti {
            animation: none !important;
          }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[470px] w-[470px] rounded-full bg-teal-200/40 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-36 top-64 -z-10 h-[440px] w-[440px] rounded-full bg-sky-200/45 blur-[110px]"
      />
      <div className="mx-auto max-w-2xl">
        <header className="mb-7 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-white/90 px-4 py-2 text-xs font-black tracking-wide text-teal-700 shadow-sm">
            <Sparkles size={16} /> تحديات سين اليومية{" "}
            <span className="text-amber-500">✦</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            مسار{" "}
            <span className="bg-gradient-to-l from-teal-500 via-emerald-500 to-sky-600 bg-clip-text text-transparent">
              اليوم
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            ارسم طريقك من الرقم 1 إلى النهاية، واملأ كل خانة لتفوز بالتحدي!
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
            <span className="rounded-xl border border-white bg-white/90 px-4 py-2.5 shadow-sm">
              {new Intl.DateTimeFormat("ar", {
                dateStyle: "long",
                timeZone: "UTC",
              }).format(new Date(`${date}T00:00:00Z`))}
            </span>
            <span className={`rounded-xl border px-4 py-2.5 ${difficultyTone}`}>
              {level.label} · {puzzle.size}×{puzzle.size}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white bg-white/90 px-4 py-2.5 shadow-sm">
              <Clock3 size={15} className="text-teal-600" />{" "}
              <span dir="ltr">{timeLabel(seconds)}</span>
            </span>
          </div>
        </header>
        <section className="relative overflow-hidden rounded-[30px] border border-white bg-white/95 p-4 shadow-[0_24px_70px_-30px_rgba(15,55,75,.27)] sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-sky-400 via-teal-400 to-emerald-400" />
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Zap size={19} className="fill-amber-400 text-amber-500" /> اصنع
                المسار
              </h2>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                اسحب بإصبعك أو بالماوس بين المربعات
              </p>
            </div>
            <div className="rounded-2xl bg-teal-50 px-4 py-2 text-center">
              <span className="block text-lg font-black tabular-nums text-teal-700">
                {progress}%
              </span>
              <span className="block text-[10px] font-bold text-teal-600">
                مكتمل
              </span>
            </div>
          </div>
          <div
            className="mx-auto w-full max-w-[490px] select-none"
            style={{ touchAction: "none" }}
            onPointerUp={() => {
              drawing.current = false;
            }}
            onPointerCancel={() => {
              drawing.current = false;
            }}
          >
            <div
              className={`grid gap-1.5 rounded-[25px] border border-slate-200/70 bg-gradient-to-br from-slate-100 to-teal-50 p-2.5 shadow-inner sm:gap-2 sm:p-3 ${completed ? "seen-win-glow" : ""}`}
              style={{
                gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: total }, (_, cell) => {
                const number = puzzle.numbers[cell];
                const active = path.includes(cell);
                const seg = getSegment(cell);
                const endpoint = active && cell === path[path.length - 1];
                return (
                  <button
                    key={cell}
                    data-zip-cell={cell}
                    type="button"
                    aria-label={`الخانة ${cell + 1}${number ? `، الرقم ${number}` : ""}`}
                    aria-pressed={active}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      drawing.current = true;
                      moveTo(cell);
                    }}
                    onPointerEnter={() => {
                      if (drawing.current) moveTo(cell);
                    }}
                    onClick={() => moveTo(cell)}
                    className={`group relative aspect-square min-w-0 overflow-hidden rounded-xl border text-lg font-black outline-offset-2 transition-[background-color,box-shadow,transform] duration-150 active:scale-[.97] sm:rounded-2xl sm:text-xl ${active ? "border-teal-300 bg-teal-100/90 shadow-[inset_0_1px_8px_rgba(13,148,136,.12)]" : "border-slate-200/90 bg-white shadow-sm hover:border-teal-300 hover:bg-teal-50"}`}
                  >
                    {active && (
                      <span className="pointer-events-none absolute inset-0">
                        {seg.top && (
                          <span className="absolute left-[39%] top-0 h-1/2 w-[22%] bg-gradient-to-r from-teal-400 to-teal-500" />
                        )}
                        {seg.bottom && (
                          <span className="absolute bottom-0 left-[39%] h-1/2 w-[22%] bg-gradient-to-r from-teal-400 to-teal-500" />
                        )}
                        {seg.left && (
                          <span className="absolute left-0 top-[39%] h-[22%] w-1/2 bg-teal-500" />
                        )}
                        {seg.right && (
                          <span className="absolute right-0 top-[39%] h-[22%] w-1/2 bg-teal-500" />
                        )}
                        <span className="absolute left-1/2 top-1/2 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500" />
                      </span>
                    )}
                    {number !== undefined && (
                      <span
                        className={`relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm shadow-md ring-[3px] ring-white/90 sm:h-10 sm:w-10 sm:text-lg ${active ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white" : "bg-gradient-to-br from-slate-700 to-slate-900 text-white"}`}
                      >
                        {number}
                      </span>
                    )}
                    {endpoint && number === undefined && (
                      <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_0_4px_rgba(255,255,255,.9),0_0_16px_rgba(251,191,36,.85)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mx-auto mt-6 max-w-[490px]">
            <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
              <span>تقدمك في المسار</span>
              <span>
                {path.length} / {total} خانة
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-l from-teal-500 via-emerald-400 to-sky-400 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              الأرقام المكتشفة:{" "}
              <b className="text-slate-700">
                {visitedNumbers} من {maxNumber}
              </b>{" "}
              · الرقم التالي:{" "}
              <b className="text-teal-700">
                {Math.min(visitedNumbers + 1, maxNumber)}
              </b>
            </p>
          </div>
          {completed && (
            <div
              role="status"
              className="seen-win-pop relative mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 text-center shadow-lg shadow-emerald-100/50"
            >
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-200">
                <Trophy size={34} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-emerald-800">
                إنجاز رائع! 🎉
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                أكملت مسار اليوم بنجاح!
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">
                  ⏱️ {timeLabel(seconds)}
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">
                  💡 {hints} تلميحات
                </span>
              </div>
              <p className="mt-4 text-xs text-emerald-700">
                تحدٍ جديد ينتظرك غداً ✨
              </p>
            </div>
          )}
          {notice && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800"
            >
              {notice}
            </p>
          )}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                setPath((p) =>
                  p.length > 1 && !completed ? p.slice(0, -1) : p,
                )
              }
              disabled={path.length <= 1 || completed}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[.98] disabled:opacity-40"
            >
              <ArrowLeft size={17} /> تراجع
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[.98]"
            >
              <RotateCcw size={17} /> إعادة
            </button>
            <button
              type="button"
              onClick={hint}
              disabled={completed}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-l from-teal-600 to-emerald-600 px-2 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-200 transition hover:brightness-110 active:scale-[.98] disabled:opacity-40"
            >
              <Lightbulb size={17} /> تلميح
            </button>
          </div>
          <p className="mt-5 text-center text-xs leading-6 text-slate-400">
            <Eraser className="ml-1 inline" size={14} /> يمكنك التراجع أثناء
            السحب بالعودة للخانة السابقة، ولا يمكن تخطي الأرقام.
          </p>
        </section>
        <footer className="mt-7 text-center text-xs text-slate-400">
          ✦ مسار اليوم · ألعاب صحيفة سين · تحدٍّ جديد كل يوم ✦
        </footer>
      </div>
      {celebrating && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        >
          {confetti.map((piece, i) => (
            <span
              key={i}
              className="seen-confetti absolute -top-8 block h-3 w-2 rounded-[2px]"
              style={{
                left: piece.left,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation})`,
                animation: `seen-confetti-fall ${piece.duration} ${piece.delay} linear forwards`,
              }}
            />
          ))}
        </div>
      )}
      {showVictory && completed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="تهانينا بإكمال اللغز"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-5 backdrop-blur-sm"
          onClick={() => setShowVictory(false)}
        >
          <div
            className="seen-win-pop relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/80 bg-white p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-amber-100 blur-2xl" />
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-teal-100 blur-2xl" />
            <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 shadow-[0_15px_35px_rgba(251,191,36,.35)]">
              <Trophy size={51} className="text-white" />
              <Star
                className="absolute -right-3 -top-2 fill-amber-300 text-amber-400"
                size={28}
              />
              <Sparkles
                className="absolute -left-5 top-2 text-teal-500"
                size={26}
              />
            </div>
            <div className="relative">
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={14} /> اكتمل التحدي
              </span>
              <h2 className="mt-2 text-3xl font-black text-slate-900">
                مبروك! 🎉
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                وصلت جميع الأرقام وملأت الشبكة بنجاح. إنجاز يستحق الاحتفال!
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <span className="block text-xs text-slate-500">الوقت</span>
                  <b className="mt-1 block text-xl text-teal-700" dir="ltr">
                    {timeLabel(seconds)}
                  </b>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <span className="block text-xs text-slate-500">
                    التلميحات
                  </span>
                  <b className="mt-1 block text-xl text-teal-700">{hints}</b>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVictory(false)}
                className="mt-6 w-full rounded-2xl bg-gradient-to-l from-teal-600 to-emerald-600 px-5 py-3.5 font-black text-white shadow-lg shadow-teal-200 transition hover:brightness-110"
              >
                رائع! متابعة ✨
              </button>
              <p className="mt-4 text-xs text-slate-400">عد غداً للغز جديد</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
