import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Shield, Cpu, Zap } from "lucide-react";
import { DashboardPreview } from "../components/DashboardPreview";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-28 pb-8 sm:pt-36 sm:pb-12 px-5 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient background glows */}
      <div className="ambient-glow-blue -top-24 left-1/4 -translate-x-1/2" />
      <div className="ambient-glow-purple top-1/3 -right-24" />
      <div className="absolute inset-0 pointer-events-none opacity-40 -z-10" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        {/* Left Column: Headline, Description & Actions (7 Cols) */}
        <div className="lg:col-span-7 text-left">
          {/* Eyebrow Pill */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6 badge-salesiq-info"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>AI-POWERED RETAIL OPERATIONS</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-white tracking-tight leading-[1.12]"
          >
            Run your retail business with{" "}
            <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-violet-400 bg-clip-text text-transparent">
              clarity.
            </span>
          </motion.h1>

          {/* Supporting Copy */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="mt-5 text-base sm:text-lg text-slate-300/90 max-w-xl font-normal leading-relaxed"
          >
            Connect sales, inventory, forecasting, and AI-powered insights in one
            intelligent retail management platform.
          </motion.p>

          {/* Call-To-Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <a
              href="#preview"
              className="btn-salesiq-primary inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Explore SalesIQ</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl glass-panel text-white font-semibold text-sm sm:text-base hover:bg-white/[0.08] transition-colors"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Platform Capability Line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-12 pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-slate-400 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>Cloud Firestore Realtime</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <span>Multi-Model Gemini AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>0ms 3-Tier Cache</span>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Floating Product Preview (5 Cols) */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
};
