import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { GlassCard } from "./GlassCard";

export const FinalCTA: React.FC = () => {
  return (
    <section className="relative py-10 sm:py-14 px-5 sm:px-6 lg:px-8 overflow-hidden defer-render-section">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-r from-sky-500/15 via-blue-600/15 to-violet-600/15 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto">
        <GlassCard
          variant="glow"
          className="p-8 sm:p-14 md:p-16 text-center relative overflow-hidden"
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6 badge-salesiq-info mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for Next-Generation Retail?</span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] max-w-3xl mx-auto"
          >
            Make your next retail decision a smarter one.
          </motion.h2>

          {/* Supporting Copy */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed"
          >
            Bring your sales, inventory, and business intelligence into one connected
            workspace. Experience real-time Firebase synchronization and autonomous Gemini
            AI insights today.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="/register.html"
              className="w-full sm:w-auto btn-salesiq-primary inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5" />
            </a>

            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl glass-panel text-white font-semibold text-base hover:bg-white/[0.08] transition-colors"
            >
              Explore Capabilities
            </a>
          </motion.div>

          {/* Micro trust indicators */}
          <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Role-Based Operational Security
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Sub-50ms Cloud Firestore Sync
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              Multi-Model Gemini AI Failover
            </span>
          </div>
        </GlassCard>
      </div>
    </section>
  );
};
