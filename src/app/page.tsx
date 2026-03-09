import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Layers3,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    Icon: Target,
    title: "Adapts to your level",
    desc: "Practice adjusts as you improve, so it stays challenging without becoming overwhelming.",
  },
  {
    Icon: Layers3,
    title: "Four activity types",
    desc: "Parsons, Tracing, Mutation, and Flashcards help students practice in different ways.",
  },
  {
    Icon: Zap,
    title: "Instant feedback",
    desc: "Understand mistakes immediately and keep learning while the problem is still fresh.",
  },
  {
    Icon: Clock3,
    title: "Timed assessments",
    desc: "Pre-test and post-test sessions make progress easy to measure.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7faf5] text-[#18211b]">
      {/* Mesh Gradient Background (Consistent with Login) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60% at_50%_-20%,rgba(34,197,94,0.18),transparent),var(--surface-0)]"
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-10 lg:px-8 lg:pb-14 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Side */}
          <div>
            <h1 className="mt-8 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#172019] sm:text-6xl lg:text-[5.2rem]">
              Personalized Programming <br />
              <span className="text-[#1f7a4f]">Adaptive Learning.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[18px] leading-8 text-[#5c6d61]">
              A personalized education platform powered by knowledge graphs and 
              intelligent adaptation. Practice through clear, guided repetition 
              designed for your unique learning journey.
            </p>

            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#1f7a4f] px-8 text-sm font-semibold !text-white transition-all hover:bg-[#176540] hover:shadow-lg active:scale-95"
              >
                Get Started
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
              {["Adaptive Logic", "Student Analytics", "Mastery Tracking"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-semibold text-[#4a5e4f]">
                  <CheckCircle2 className="size-4 text-[#22a861]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Platform feature panel */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-[48px] bg-[#22a861]/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 p-3 shadow-2xl shadow-green-900/10 backdrop-blur-xl">
              <div className="overflow-hidden rounded-[24px] border border-[#d9e8d7] bg-white">

                {/* Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1a6640] via-[#1f7a4f] to-[#29a05a] px-7 py-6 text-white">
                  <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/[0.06]" />
                  <div className="pointer-events-none absolute -bottom-10 -left-4 size-28 rounded-full bg-white/[0.04] blur-2xl" />
                  <div className="relative">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-green-200/60">AdapTeach</p>
                    <h3 className="mt-1 text-xl font-bold leading-tight">Adaptive Learning Platform</h3>
                    <p className="mt-1.5 text-sm text-green-100/70">Tailored Python debugging practice for every student.</p>
                  </div>
                </div>

                {/* Feature rows */}
                <div className="divide-y divide-[#edf3ec]">
                  {FEATURES.map(({ Icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-4 px-6 py-4">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#1f7a4f]">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1a2e1f]">{title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#617065]">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer note */}
                <div className="border-t border-[#edf3ec] bg-[#f7fbf7] px-6 py-3">
                  <p className="text-center text-[11px] text-[#8aab8e]">Difficulty adjusts automatically as you improve.</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-[24px] border border-[#d8e6d7] bg-white p-8 transition hover:border-[#22a861]/40 hover:shadow-md"
            >
              <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-[#eaf7ed] text-[#1f7a4f]">
                <Icon className="size-6" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-[#202922]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#617065]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        <div 
          className="relative overflow-hidden rounded-[40px] px-8 py-16 text-center text-white"
          style={{ background: "linear-gradient(145deg, #17332f, #27554b, #356f61)" }}
        >
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-emerald-500/10 blur-[100px]" />
          
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              Ready to continue?
            </h2>
            <p className="mt-4 text-lg text-emerald-50/70">
              Sign in with your study credentials to access your personalized 
              learning activities and resume your progress.
            </p>
            
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-flex h-14 items-center gap-3 rounded-xl bg-[#1f7a4f] px-12 text-base font-bold text-white transition-all hover:scale-[1.02] hover:bg-[#258d5c] hover:shadow-xl"
              >
                Sign In Now
                <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}