import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, Shield, Zap, Cpu, MapPin, BarChart3, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReGrid · Spatial Intelligence for Clean Energy Siting" },
      { name: "description", content: "Know every conflict before you break ground. ReGrid scores any energy site against federal datasets in seconds." },
    ],
  }),
  component: LandingPage,
});

// ─── Animated number count-up ───────────────────────────────────────────────
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const dur = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── Score mockup (hero visual) ─────────────────────────────────────────────
function ScoreMockup() {
  const conflicts = [
    { label: "Wildfire risk zone", weight: 32, color: "#fb923c", pct: 91 },
    { label: "EJScreen disadvantaged", weight: 28, color: "#f472b6", pct: 80 },
    { label: "HIFLD transmission", weight: 18, color: "#38bdf8", pct: 51 },
  ];
  return (
    <div className="relative select-none">
      {/* Main score card */}
      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-[300px] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#060e1b]/95 shadow-[0_40px_100px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-xl"
      >
        {/* Top glow line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />

        <div className="relative p-5">
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/25 uppercase">Siting Risk</p>
          <div className="mt-1 flex items-end gap-1.5">
            <span
              className="font-serif text-[72px] font-normal leading-none tabular-nums"
              style={{ color: "#fb923c", textShadow: "0 0 60px rgba(251,146,60,0.4)" }}
            >
              78
            </span>
            <span className="mb-2 text-lg font-light text-white/20">/ 100</span>
          </div>
          <div className="mt-2 h-px bg-white/[0.07]" />
          <p className="mt-2 text-[11px] text-white/35">High risk · 3 active conflicts</p>

          <ul className="mt-4 space-y-3">
            {conflicts.map((c) => (
              <li key={c.label}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-white/60">{c.label}</span>
                  <span className="font-mono text-[11px] font-semibold" style={{ color: c.color }}>+{c.weight}</span>
                </div>
                <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: c.color, boxShadow: `0 0 6px ${c.color}66` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${c.pct}%` }}
                    transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <p className="font-mono text-[9px] tracking-[0.25em] text-white/20 uppercase">Recommendation</p>
            <p className="mt-1 text-[11px] italic leading-relaxed text-white/35">
              Move 4.2 km northeast — score drops to 31.
            </p>
            <button className="mt-1.5 text-[11px] font-medium text-white/40 hover:text-white/70 transition">
              Apply suggestion →
            </button>
          </div>
        </div>
      </motion.div>

      {/* Floating layers card */}
      <motion.div
        animate={{ y: [6, -6, 6] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-6 -left-12 w-[168px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#060e1b]/90 p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        <p className="font-mono text-[8.5px] tracking-[0.28em] text-white/20 uppercase">Active layers</p>
        <ul className="mt-2.5 space-y-1.5">
          {[
            ["Wildfire zones", "#fb923c", true],
            ["Transmission", "#38bdf8", true],
            ["EJScreen", "#f472b6", true],
            ["Power plants", "#22d3ee", false],
          ].map(([name, color, on]) => (
            <li key={name as string} className="flex items-center gap-2">
              <span
                className="h-[6px] w-[6px] shrink-0 rounded-full"
                style={{
                  backgroundColor: on ? (color as string) : "transparent",
                  border: `1px solid ${on ? color : "rgba(255,255,255,0.15)"}`,
                  boxShadow: on ? `0 0 5px ${color}88` : undefined,
                }}
              />
              <span className={`text-[10px] ${on ? "text-white/50" : "text-white/18"}`}>{name as string}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Floating "AI optimizing" chip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -8] }}
        transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 4, ease: "easeOut" }}
        className="absolute -right-8 top-1/2 flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
        <span className="font-mono text-[9px] tracking-wide text-amber-300/70">Optimizing…</span>
      </motion.div>
    </div>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.05]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/55" fill="currentColor">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3zM5 9.7l6 3.45V20l-6-3.33V9.7zm14 7l-6 3.33v-6.85l6-3.45v6.97z" />
            </svg>
          </div>
          <span className="text-[14px] tracking-tight">
            <span className="font-light italic text-white/40">Re</span>
            <span className="font-bold text-white">Grid</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-[12px] text-white/25 sm:block">Spatial Intelligence · Beta</span>
          <Link
            to="/app"
            className="group flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.05] px-4 py-2 text-[12.5px] font-medium text-white/65 transition duration-200 hover:border-white/22 hover:bg-white/[0.1] hover:text-white"
          >
            Use the Tool
            <ArrowRight className="h-3.5 w-3.5 transition duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden px-6 pt-20 sm:px-10">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 top-1/4 h-[600px] w-[600px] rounded-full bg-amber-500/[0.06] blur-[120px]" />
        <div className="absolute -right-24 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[500px] rounded-full bg-indigo-500/[0.04] blur-[110px]" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-16 lg:flex-row lg:items-center lg:gap-20">
        {/* Left copy */}
        <div className="flex-1">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-5 font-mono text-[10px] tracking-[0.35em] text-white/45 uppercase"
          >
            Spatial Intelligence Platform
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="font-serif text-[clamp(46px,7vw,88px)] font-normal leading-[0.93] tracking-tight"
          >
            <span className="text-white">Know before</span>
            <br />
            <span className="italic text-white/40">you</span>{" "}
            <span className="text-white">build.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="mt-7 max-w-lg text-[clamp(15px,1.6vw,17px)] font-light leading-relaxed text-white/58"
          >
            ReGrid scores any potential solar, wind, or battery site from 0–100 against
            federal transmission corridors, wildfire risk, and environmental equity
            datasets — in seconds, before you sign a lease.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              to="/app"
              className="group flex items-center gap-3 rounded-xl border border-white/14 bg-white/[0.07] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_0_30px_rgba(255,255,255,0.04)] transition duration-200 hover:border-white/24 hover:bg-white/[0.12] hover:shadow-[0_0_50px_rgba(255,255,255,0.08)]"
            >
              Use the Tool
              <ArrowRight className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
            </Link>
            <span className="text-[11.5px] text-white/38">Free · No account required · Runs in browser</span>
          </motion.div>

          {/* Social proof mini-strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-12 flex flex-wrap gap-x-8 gap-y-3"
          >
            {[
              ["5", "federal datasets"],
              ["<2s", "to score any site"],
              ["100", "point risk scale"],
            ].map(([num, label]) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="font-serif text-[22px] text-white/50">{num}</span>
                <span className="text-[11px] text-white/40">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: mockup */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="flex-shrink-0 lg:pr-8"
        >
          <ScoreMockup />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <div className="h-6 w-px bg-gradient-to-b from-white/20 to-transparent" />
        <span className="font-mono text-[8.5px] tracking-[0.3em] text-white/15 uppercase">Scroll</span>
      </motion.div>
    </section>
  );
}

// ─── Marquee ────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  "HIFLD Transmission Lines",
  "USDA Wildfire Risk Zones",
  "EPA EJScreen",
  "EIA Grid Infrastructure",
  "Power Plant Facilities",
  "Federal Conflict Screening",
  "AI Siting Optimizer",
  "Real-time Risk Scoring",
];

function DataStrip() {
  return (
    <div className="border-y border-white/[0.06] py-4 overflow-hidden">
      <div className="flex animate-marquee gap-12 whitespace-nowrap">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] text-white/18 uppercase">
            <span className="h-1 w-1 rounded-full bg-white/15" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Score showcase ──────────────────────────────────────────────────────────
function ScoreShowcase() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="relative overflow-hidden py-32 px-6 sm:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.05] blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="font-mono text-[10px] tracking-[0.3em] text-white/45 uppercase"
        >
          The number that changes everything
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mt-4 flex items-end justify-center gap-3"
        >
          <span
            className="font-serif leading-none tabular-nums"
            style={{
              fontSize: "clamp(100px, 18vw, 180px)",
              color: "#fb923c",
              textShadow: "0 0 120px rgba(251,146,60,0.35), 0 0 40px rgba(251,146,60,0.2)",
            }}
          >
            {inView ? <CountUp target={62} /> : "0"}
          </span>
          <span className="mb-4 text-[clamp(20px,3vw,36px)] font-light text-white/18">/ 100</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-4 text-[clamp(18px,2.5vw,24px)] font-light text-white/62"
        >
          Every site, scored before you sign.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-4 max-w-md text-[14px] font-light leading-relaxed text-white/45"
        >
          Drop a footprint on the map. Within seconds, ReGrid returns a composite risk
          score weighted across every active federal dataset — and tells you exactly
          what's driving it.
        </motion.p>
      </div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Shield,
    tag: "Federal conflict screening",
    headline: "Every protected layer, checked automatically.",
    body: "ReGrid runs your footprint against HIFLD transmission corridors, USDA wildfire risk zones, EPA EJScreen census tracts, and EIA grid infrastructure the moment you drop a pin.",
    accent: "#38bdf8",
    stat: "5 datasets",
    statLabel: "checked per site",
  },
  {
    icon: BarChart3,
    tag: "Weighted risk scoring",
    headline: "A single number you can defend.",
    body: "Each conflict contributes a weighted penalty to a 0–100 composite score. Toggle datasets on/off to model different stakeholder scenarios — the score updates live.",
    accent: "#fb923c",
    stat: "<2 sec",
    statLabel: "to full score",
  },
  {
    icon: Sparkles,
    tag: "AI siting copilot",
    headline: "Type a goal. Get a site.",
    body: "Describe what you need in plain English — 'lowest-risk solar in Central Valley under 35 score, 80 acres' — and the AI copilot finds, places, and scores the best candidate automatically.",
    accent: "#a78bfa",
    stat: "0 to sited",
    statLabel: "in one sentence",
  },
];

function Features() {
  return (
    <section className="py-24 px-6 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-mono text-[10px] tracking-[0.3em] text-white/45 uppercase"
          >
            What it does
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-3 font-serif text-[clamp(28px,4vw,44px)] text-white/90"
          >
            Everything you need to site faster.
          </motion.h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.tag}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.05] p-7 transition duration-300 hover:border-white/20 hover:bg-white/[0.08]"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl transition duration-500 group-hover:scale-125"
                style={{ backgroundColor: f.accent, opacity: 0.07 }}
              />
              <div
                className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{ borderColor: `${f.accent}25`, backgroundColor: `${f.accent}10` }}
              >
                <f.icon className="h-4.5 w-4.5" style={{ color: f.accent, opacity: 0.8 }} strokeWidth={1.5} />
              </div>
              <p className="font-mono text-[9px] tracking-[0.22em] text-white/25 uppercase">{f.tag}</p>
              <h3 className="mt-2 text-[15px] font-semibold leading-snug text-white/85">{f.headline}</h3>
              <p className="mt-3 text-[12.5px] font-light leading-relaxed text-white/50">{f.body}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-[22px]" style={{ color: f.accent, opacity: 0.7 }}>{f.stat}</span>
                <span className="text-[11px] text-white/22">{f.statLabel}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ───────────────────────────────────────────────────────────
const STEPS = [
  { n: "01", icon: MapPin, title: "Drop a pin", body: "Click anywhere on California or type a location into the AI copilot. Choose your site shape — circle, square, or hex — and set the acreage." },
  { n: "02", icon: BarChart3, title: "Get your score", body: "ReGrid instantly runs your footprint against 5 federal datasets and returns a weighted 0–100 risk score with every conflict itemized and ranked." },
  { n: "03", icon: Cpu, title: "Optimize with AI", body: "Ask the copilot to find a better site, or hit Optimize. The AI scans a 30 km grid to find the lowest-risk alternative and moves your footprint there." },
];

function HowItWorks() {
  return (
    <section className="border-t border-white/[0.06] py-24 px-6 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-mono text-[10px] tracking-[0.3em] text-white/45 uppercase"
          >
            How it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-3 font-serif text-[clamp(26px,3.5vw,40px)] text-white/75"
          >
            From map to decision in under a minute.
          </motion.h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.55 }}
              className="relative flex flex-col gap-4"
            >
              {i < STEPS.length - 1 && (
                <div className="absolute left-1/2 top-5 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-white/10 to-transparent sm:block" />
              )}
              <div className="flex items-center gap-3">
                <span className="font-serif text-[28px] leading-none text-white/12">{s.n}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <s.icon className="h-4 w-4 text-white/35" strokeWidth={1.4} />
                </div>
              </div>
              <h3 className="text-[15px] font-semibold text-white/85">{s.title}</h3>
              <p className="text-[12.5px] font-light leading-relaxed text-white/52">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats bar ──────────────────────────────────────────────────────────────
function StatsBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const stats = [
    { n: 5, suffix: "", label: "Federal datasets" },
    { n: 100, suffix: "", label: "Point risk scale" },
    { n: 2, suffix: "s", label: "Time to score" },
    { n: 30, suffix: "km", label: "Optimization radius" },
  ];
  return (
    <section ref={ref} className="border-t border-white/[0.06] py-16 px-6 sm:px-10">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: i * 0.1 + 0.2 }}
            className="text-center"
          >
            <p className="font-serif text-[clamp(32px,4vw,48px)] font-normal text-white/55">
              {inView ? <CountUp target={s.n} suffix={s.suffix} /> : `0${s.suffix}`}
            </p>
            <p className="mt-1 text-[11px] text-white/22">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] py-36 px-6 sm:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.025] blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-mono text-[10px] tracking-[0.3em] text-white/42 uppercase"
        >
          Ready to start
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-4 font-serif text-[clamp(32px,5vw,64px)] font-normal leading-tight text-white/88"
        >
          Find your lowest-risk site today.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-[15px] font-light text-white/45"
        >
          Paste a free Mapbox token and you're live in under 60 seconds.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <Link
            to="/app"
            className="group inline-flex items-center gap-3 rounded-2xl border border-white/14 bg-white/[0.06] px-8 py-4 text-[15px] font-semibold text-white/70 shadow-[0_0_40px_rgba(255,255,255,0.04)] transition duration-300 hover:border-white/24 hover:bg-white/[0.1] hover:text-white hover:shadow-[0_0_70px_rgba(255,255,255,0.09)]"
          >
            Use the Tool
            <ArrowRight className="h-4.5 w-4.5 transition duration-200 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/[0.05] px-6 py-6 sm:px-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <span className="text-[11px] text-white/14">
          <span className="font-light italic">Re</span><span className="font-bold">Grid</span>
          {" "}· Clean Energy Siting Intelligence
        </span>
        <span className="font-mono text-[9px] tracking-wider text-white/10 uppercase">Beta</span>
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#060d1c] text-white">
      <Nav />
      <Hero />
      <DataStrip />
      <ScoreShowcase />
      <Features />
      <HowItWorks />
      <StatsBar />
      <FinalCTA />
      <Footer />
    </div>
  );
}
