import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, Cpu } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReGrid · Spatial Intelligence for Clean Energy Siting" },
      {
        name: "description",
        content:
          "Enterprise spatial intelligence for siting solar, wind, and battery projects. Real-time conflict analysis against federal datasets.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Shield,
    label: "Federal conflict screening",
    desc: "Real-time analysis against HIFLD transmission, USDA wildfire, and EPA EJScreen layers.",
  },
  {
    icon: Zap,
    label: "Risk scoring /100",
    desc: "Weighted composite score across all active datasets — updated instantly as you move the site.",
  },
  {
    icon: Cpu,
    label: "AI siting optimizer",
    desc: "Natural-language copilot finds the lowest-risk footprint within your target region automatically.",
  },
];

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04080e] text-white">
      {/* ── Ambient background glows ────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[700px] w-[700px] rounded-full bg-cyan-500/[0.05] blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[600px] w-[600px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/[0.04] blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(103,232,249,1) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-6">
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/60" fill="currentColor">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3zM5 9.7l6 3.45V20l-6-3.33V9.7zm14 7l-6 3.33v-6.85l6-3.45v6.97z" />
            </svg>
          </div>
          <span className="text-[15px] tracking-tight">
            <span className="font-light italic text-white/40">Re</span>
            <span className="font-bold text-white">Grid</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className="hidden text-[12px] font-light text-white/30 sm:block">
            Clean Energy Siting Intelligence
          </span>
          <Link
            to="/app"
            className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.05] px-4 py-2 text-[13px] font-medium text-white/70 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
          >
            Use the Tool
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6 text-center sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-6 font-mono text-[10px] tracking-[0.35em] text-white/25 uppercase"
          >
            Spatial Intelligence Platform · Beta
          </motion.p>

          {/* Main headline */}
          <h1 className="font-serif text-[clamp(52px,9vw,110px)] font-normal leading-[0.92] tracking-tight text-white">
            Site clean
            <br />
            <span className="italic text-white/50">energy</span>{" "}
            <span className="text-white">smarter.</span>
          </h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="mx-auto mt-8 max-w-xl text-[clamp(15px,2vw,18px)] font-light leading-relaxed text-white/38"
          >
            Place solar, wind, and battery projects on the map. Get instant conflict
            analysis against federal transmission, wildfire, and equity datasets — scored
            from 0 to 100.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              to="/app"
              className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.07] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_0_40px_rgba(255,255,255,0.04)] transition duration-200 hover:border-white/25 hover:bg-white/[0.12] hover:shadow-[0_0_60px_rgba(255,255,255,0.08)]"
            >
              Use the Tool
              <ArrowRight className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
            </Link>
            <span className="text-[12px] text-white/18">No account required · runs in your browser</span>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-white/18 uppercase">Scroll</span>
            <div className="h-5 w-px bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </motion.div>
      </section>

      {/* ── Feature strip ────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.06] px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center font-mono text-[10px] tracking-[0.3em] text-white/22 uppercase"
          >
            What it does
          </motion.p>

          <div className="grid gap-10 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55 }}
                className="flex flex-col gap-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <f.icon className="h-4 w-4 text-white/40" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white/70">{f.label}</p>
                  <p className="mt-2 text-[13px] font-light leading-relaxed text-white/28">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA banner ────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.06] px-6 py-20 text-center sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-serif text-[clamp(28px,4vw,48px)] font-normal text-white/70">
            Ready to find your site?
          </p>
          <p className="mt-3 text-[14px] font-light text-white/25">
            Paste a Mapbox token and start siting in under a minute.
          </p>
          <Link
            to="/app"
            className="mt-8 inline-flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.05] px-8 py-3.5 text-[14px] font-semibold text-white/70 transition hover:border-white/22 hover:bg-white/[0.1] hover:text-white"
          >
            Open the Tool <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.05] px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/15">
            <span className="font-light italic">Re</span>
            <span className="font-semibold">Grid</span>
            {" "}· Spatial Intelligence Platform
          </span>
          <span className="font-mono text-[10px] text-white/10">Beta</span>
        </div>
      </footer>
    </div>
  );
}
