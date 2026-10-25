"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Feather,
  Fingerprint,
  Heart,
  MoveUpLeft,
  ScanEye,
  Sparkles,
  Users,
} from "lucide-react";

import Navbar from "@/components/Navbar";

const principles = [
  {
    number: "01",
    title: "للقارئ",
    subtitle: "المعنى أولاً",
    description:
      "نؤمن بأن القارئ يستحق محتوى يمنحه أكثر من معلومة عابرة؛ محتوى يفتح أمامه زوايا جديدة للفهم والتفكير.",
    icon: BookOpen,
    className: "md:mt-16",
    accent: "bg-[#e5e8d9]",
  },
  {
    number: "02",
    title: "للكاتب",
    subtitle: "لكل فكرة مساحة",
    description:
      "نوفر مساحة للكتّاب كي يعبروا عن أفكارهم، ويقدموا رؤاهم، ويصلوا إلى قراء يقدّرون الكلمة المكتوبة.",
    icon: Feather,
    className: "md:mt-0",
    accent: "bg-[#eee1d1]",
  },
  {
    number: "03",
    title: "للمحرر",
    subtitle: "الجودة مسؤولية",
    description:
      "نرى أن التحرير ليس مجرد مراجعة للنص، بل مسؤولية عن وضوح الفكرة ودقة المعلومة وجودة ما يصل إلى القارئ.",
    icon: ScanEye,
    className: "md:mt-20",
    accent: "bg-[#e7e0eb]",
  },
  {
    number: "04",
    title: "للمجتمع",
    subtitle: "الاختلاف مساحة",
    description:
      "نطمح إلى فضاء يحترم العقول، ويمنح الأفكار فرصة للنقاش، ويجعل الاختلاف مدخلاً للفهم لا سبباً للإقصاء.",
    icon: Users,
    className: "md:mt-4",
    accent: "bg-[#dce8e4]",
  },
];

const entrance = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function AboutPage() {
  const shouldReduceMotion = useReducedMotion();

  const reveal = shouldReduceMotion
    ? {}
    : {
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, amount: 0.2 },
        variants: entrance,
      };

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#f5f3ec] text-[#202820] selection:bg-[#dce5cf] selection:text-[#202820]"
    >
      <Navbar />

      {/* الافتتاحية */}
      <section className="relative px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:pb-36 lg:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-[#dfe5d3]/50 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.7 }}
            className="mb-12 flex items-center justify-between gap-4 border-b border-[#dcdcd1] pb-5 sm:mb-16"
          >
            <span className="text-sm font-bold tracking-[0.22em] text-[#72796b] sm:text-sm">
              عن سين
            </span>

            <span className="flex items-center gap-2 text-xs text-[#72796b] sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-[#72815e]" />
              مساحة للفكرة والحقيقة
            </span>
          </motion.div>

          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div className="relative z-10">
              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.7,
                  delay: 0.1,
                }}
                className="mb-6 flex items-center gap-3 text-sm font-medium text-[#68745b] sm:text-base"
              >
                <span className="h-px w-10 bg-[#8d997b]" />
                الصحافة كما نؤمن بها
              </motion.p>

              <motion.h1
                initial={
                  shouldReduceMotion ? false : { opacity: 0, y: 30 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.9,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="max-w-3xl text-5xl font-black leading-[1.35] tracking-tight sm:text-6xl lg:text-8xl lg:leading-[1.3]"
              >
                لأن الصحافة
                <br />
                <span className="relative inline-block text-[#748361]">
                  سؤال
                  <motion.span
                    aria-hidden="true"
                    initial={{ scaleX: shouldReduceMotion ? 1 : 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.8,
                      delay: 0.7,
                    }}
                    className="absolute -bottom-1 right-0 h-2 w-full origin-right rounded-full bg-[#d6dfc8] sm:-bottom-2 sm:h-3"
                  />
                </span>
                <span className="text-[#b5a68c]">.</span>
              </motion.h1>

              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.7,
                  delay: 0.4,
                }}
                className="mt-8 max-w-xl text-base leading-9 text-[#62695e] sm:mt-10 sm:text-lg sm:leading-10"
              >
                لسنا هنا لنضيف صوتاً آخر إلى الضجيج. نحن هنا لنمنح الفكرة
                وقتها، والسؤال حقه، والحقيقة مساحة تستحقها.
              </motion.p>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.7,
                  delay: 0.6,
                }}
                className="mt-9 flex flex-wrap items-center gap-4 sm:mt-11"
              >
                <a
                  href="#our-story"
                  className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-[#273329] px-6 py-3 text-sm font-semibold text-[#f5f3ec] transition-colors duration-300 hover:bg-[#3b4a3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#748361] focus-visible:ring-offset-2"
                >
                  اكتشف حكاية سين
                  <ArrowDownLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 group-hover:translate-y-1" />
                </a>

                <span className="text-sm text-[#858779]">
                  فكرة تبدأ بسؤال
                </span>
              </motion.div>
            </div>

            {/* الشعار والتكوين البصري */}
            <motion.div
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, scale: 0.94, rotate: 2 }
              }
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 1,
                delay: 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative mx-auto w-full max-w-md lg:max-w-none"
            >
              <div className="relative aspect-[0.92] overflow-hidden rounded-[2rem] border border-[#e0dfd4] bg-[#e9eadd] p-6 sm:rounded-[2.5rem] sm:p-9">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "radial-gradient(#8d997b 0.7px, transparent 0.7px)",
                    backgroundSize: "17px 17px",
                  }}
                />

                <div
                  aria-hidden="true"
                  className="absolute -left-20 top-16 h-64 w-64 rounded-full border border-[#aeb69e]/70"
                />
                <div
                  aria-hidden="true"
                  className="absolute -left-10 top-26 h-48 w-48 rounded-full border border-[#aeb69e]/60"
                />

                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] text-[#68745b]">
                        SEEN / IDENTITY
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#818676]">
                        الكلمة تصنع الفرق
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#aeb69e] text-[#68745b]">
                      <Fingerprint className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="relative flex flex-col items-center py-6">
                    <motion.div
                      animate={
                        shouldReduceMotion
                          ? undefined
                          : { y: [0, -7, 0] }
                      }
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="relative flex h-44 w-44 items-center justify-center rounded-full border border-[#bdc5ad] bg-[#f5f3ec]/70 p-5 shadow-[0_20px_60px_rgba(65,78,54,0.08)] sm:h-56 sm:w-56"
                    >
                      <div className="flex h-full w-full items-center justify-center rounded-full border border-[#d8ddcc] bg-[#f5f3ec]">
                        <Image
                          src="/logo.png"
                          alt="شعار سين"
                          width={200}
                          height={100}
                          priority
                          className="h-auto max-h-24 w-36 object-contain sm:w-44"
                        />
                      </div>
                    </motion.div>

                    <div className="mt-7 flex items-center gap-3">
                      <span className="h-px w-8 bg-[#9ca68b]" />
                      <span className="text-sm font-medium text-[#68745b]">
                        نرى ما وراء الخبر
                      </span>
                      <span className="h-px w-8 bg-[#9ca68b]" />
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          </div>

          <motion.div
            {...reveal}
            className="mt-16 flex items-center justify-between border-t border-[#dcdcd1] pt-5 sm:mt-24"
          >
            <a
              href="#our-story"
              aria-label="انتقل إلى حكاية سين"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d5d6c9] text-[#65725a] transition-colors hover:bg-[#e7eadd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#748361]"
            >
              <ArrowDownLeft className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* الحكاية */}
      <section
        id="our-story"
        className="scroll-mt-20 bg-[#29362c] px-5 py-20 text-[#f5f3ec] sm:px-8 sm:py-28 lg:py-36"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
          <motion.div {...reveal}>
            <p className="flex items-center gap-3 text-sm font-medium text-[#c0cbb0]">
              <span className="h-px w-8 bg-[#9dab8d]" />
              حكايتنا
            </p>

            <p className="mt-6 text-5xl font-black leading-tight sm:text-7xl">
              لماذا
              <br />
              <span className="text-[#c5d0b7]">سين؟</span>
            </p>

            <div className="mt-8 h-px w-20 bg-[#819078]" />
          </motion.div>

          <motion.div
            {...reveal}
            className="max-w-3xl lg:pt-10"
          >
            <p className="text-2xl font-semibold leading-[1.9] sm:text-3xl sm:leading-[1.9]">
              لأن كل حقيقة تبدأ بسؤال، وكل فهم حقيقي يبدأ بالرغبة في معرفة
              ما وراء الأشياء.
            </p>

            <p className="mt-7 text-base leading-9 text-[#d0d5ca] sm:text-lg sm:leading-10">
              سين منصة صحفية عربية تجمع الكتّاب والمحررين والقراء في مساحة
              واحدة، نؤمن فيها بأن قيمة الصحافة لا تقاس بكمية ما تنشره فحسب،
              بل بقدرتها على توضيح ما يلتبس، وفتح آفاق جديدة، وتقديم محتوى
              يحترم عقل القارئ ووقته.
            </p>

            <p className="mt-5 text-base leading-9 text-[#d0d5ca] sm:text-lg sm:leading-10">
              نريد أن تكون الكلمة هنا بداية لفكرة، والفكرة بداية لحوار،
              والحوار طريقاً إلى فهم أعمق للعالم من حولنا.
            </p>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#657565] text-[#c5d0b7]">
                <Heart className="h-5 w-5" />
              </div>
              <p className="text-sm leading-7 text-[#c5d0b7]">
                صحافة أقرب إلى الإنسان،
                <br />
                وأوفى للحقيقة.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* المبادئ والخدمات */}
      <section className="px-5 py-20 sm:px-8 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <motion.div
            {...reveal}
            className="mb-14 flex flex-col justify-between gap-6 sm:mb-20 lg:flex-row lg:items-end"
          >
            <div>
              <p className="flex items-center gap-3 text-sm font-medium text-[#748361]">
                <span className="h-px w-8 bg-[#9ca68b]" />
                ما الذي نصنعه؟
              </p>

              <h2 className="mt-5 max-w-2xl text-4xl font-black leading-[1.5] sm:text-5xl lg:text-6xl">
                الصحافة مساحة
                <br />
                <span className="text-[#748361]">يشترك فيها الجميع.</span>
              </h2>
            </div>

            <p className="max-w-md text-base leading-8 text-[#707568] sm:text-lg sm:leading-9">
              لكل طرف دور في صناعة المحتوى الجيد. لذلك نعمل على تجربة تجمع
              بين جودة الكلمة، وأدوات النشر، واحترام القارئ.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
            {principles.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.article
                  key={item.number}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 30 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.65,
                    delay: shouldReduceMotion ? 0 : index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`group relative overflow-hidden rounded-[1.75rem] border border-[#e4e2d8] bg-[#faf9f5] p-7 transition-colors duration-300 hover:border-[#c9d0bb] hover:bg-white sm:p-9 ${item.className}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-sm tracking-wider text-[#96998a]">
                      {item.number}
                    </span>

                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${item.accent}`}
                    >
                      <Icon className="h-6 w-6 text-[#465443]" />
                    </div>
                  </div>

                  <p className="mt-9 text-sm font-medium text-[#7a866a]">
                    {item.subtitle}
                  </p>

                  <h3 className="mt-2 text-3xl font-black text-[#283329] sm:text-4xl">
                    {item.title}
                  </h3>

                  <p className="mt-5 max-w-lg text-base leading-8 text-[#71766a]">
                    {item.description}
                  </p>

                  <div className="mt-8 flex items-center justify-between border-t border-[#e8e6dc] pt-5">
                    <span className="text-xs text-[#929486]">
                      جزء من حكاية سين
                    </span>

                    <ArrowUpLeft className="h-5 w-5 text-[#7b896d] transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* المبدأ التحريري */}
      <section className="px-5 pb-20 sm:px-8 sm:pb-28 lg:pb-36">
        <motion.div
          {...reveal}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#e7e9dc] px-6 py-12 sm:rounded-[2.5rem] sm:px-12 sm:py-16 lg:px-20 lg:py-24"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full border border-[#c6ccb8] sm:-left-8 sm:-top-28 sm:h-96 sm:w-96"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-2 top-0 h-64 w-64 rounded-full border border-[#c6ccb8]/70 sm:h-80 sm:w-80"
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="flex items-center gap-3 text-sm font-semibold text-[#6b795d]">
                <Sparkles className="h-4 w-4" />
                ما نؤمن به
              </p>

              <h2 className="mt-6 text-3xl font-black leading-[1.7] sm:text-5xl sm:leading-[1.6] lg:text-6xl">
                لا نبحث عن إجابة
                <br />
                <span className="text-[#748361]">
                  تُنهي التفكير،
                </span>
                <br />
                بل عن سؤال يوسّعه.
              </h2>

              <p className="mt-6 max-w-xl text-base leading-8 text-[#697062] sm:text-lg sm:leading-9">
                لأن الصحافة الجيدة لا تخبرنا فقط بما حدث، بل تساعدنا على
                فهم لماذا حدث، وما الذي يعنيه، وما الذي يستحق أن نسأل عنه
                بعد ذلك.
              </p>
            </div>

            <div className="hidden h-44 w-44 items-center justify-center rounded-full border border-[#b7c0a8] lg:flex">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border border-[#b7c0a8]">
                <span className="text-7xl font-black text-[#748361]">
                  س
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* الخاتمة */}
      <section className="border-t border-[#deddd2] px-5 py-20 sm:px-8 sm:py-28 lg:py-32">
        <motion.div
          {...reveal}
          className="mx-auto flex max-w-5xl flex-col items-center text-center"
        >
          <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-[#d5d8c9] bg-[#e9ebdf] text-[#68775a]">
            <MoveUpLeft className="h-7 w-7" />
          </div>

          <p className="text-sm font-medium text-[#748361]">
            الحكاية لا تنتهي هنا
          </p>

          <h2 className="mt-5 text-4xl font-black leading-[1.5] sm:text-6xl sm:leading-[1.4]">
            السؤال القادم
            <br />
            <span className="text-[#748361]">قد يبدأ معك.</span>
          </h2>

          <p className="mt-6 max-w-xl text-base leading-8 text-[#71766a] sm:text-lg sm:leading-9">
            اكتشف ما يُنشر في سين، واقرأ أفكاراً تستحق وقتك، وكن جزءاً من
            مساحة نؤمن فيها بأن المعرفة تبدأ بالفضول.
          </p>

          <Link
            href="/"
            className="group mt-9 inline-flex min-h-14 items-center gap-3 rounded-full bg-[#29362c] px-7 py-4 text-sm font-semibold text-[#f5f3ec] transition-colors duration-300 hover:bg-[#3b4a3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#748361] focus-visible:ring-offset-2"
          >
            اكتشف سين
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>

          <div className="mt-16 flex w-full items-center justify-between border-t border-[#deddd2] pt-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="سين"
                width={80}
                height={40}
                className="h-auto w-12 object-contain"
              />
              <span className="text-sm font-bold text-[#394437]">
                لأن الصحافة سؤال
              </span>
            </div>

            <a
              href="#top"
              onClick={(event) => {
                event.preventDefault();
                window.scrollTo({
                  top: 0,
                  behavior: shouldReduceMotion ? "auto" : "smooth",
                });
              }}
              className="inline-flex items-center gap-2 text-xs text-[#7c8174] transition-colors hover:text-[#394437] sm:text-sm"
            >
              إلى الأعلى
              <ArrowDownLeft className="h-4 w-4 rotate-180" />
            </a>
          </div>
        </motion.div>
      </section>
    </main>
  );
}