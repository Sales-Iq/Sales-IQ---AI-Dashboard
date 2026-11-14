import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  Sparkles,
  CreditCard,
  QrCode,
  Banknote,
} from "lucide-react";
import { SectionHeading } from "../components/SectionHeading";
import { GlassCard } from "../components/GlassCard";
import { SalesChart } from "../components/SalesChart";
import { AnimatedCounter } from "../components/AnimatedCounter";
import {
  DEMO_RANGES,
  DemoRange,
  DEMO_METRICS,
  DEMO_CHARTS,
  DEMO_TRANSACTIONS,
  DEMO_INVENTORY_ALERTS,
} from "../data/demoData";

export const ProductPreviewSection: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<DemoRange>("Today");
  const [viewMode, setViewMode] = useState<"sales" | "inventory">("sales");

  const currentMetrics = DEMO_METRICS[selectedRange];
  const currentChart = DEMO_CHARTS[selectedRange];

  const paymentIcons = {
    UPI: <QrCode className="w-3 h-3 text-emerald-400" />,
    Card: <CreditCard className="w-3 h-3 text-sky-400" />,
    Cash: <Banknote className="w-3 h-3 text-amber-400" />,
  };

  return (
    <section id="preview" className="scroll-mt-20 sm:scroll-mt-24 relative pt-4 pb-10 sm:pt-6 sm:pb-12 px-5 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Interactive Product Showcase"
          title="See your operations in motion."
          subtitle="Explore how SalesIQ synthesizes cash register receipts, live stock alerts, and machine-learning forecasts into a unified executive command center."
        />

        {/* The Dashboard Mockup Canvas */}
        <div className="relative isolated-dashboard-canvas">
          {/* Simulated Demo Notice Badge */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="font-semibold tracking-wider text-[11px] uppercase">
                Simulated Demo Activity
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 text-[11px]">
                Isolated local dataset (Zero production writes)
              </span>
            </div>

            {/* Time Range Filter Controls */}
            <div className="flex items-center gap-1.5 glass-panel p-1 rounded-xl">
              {DEMO_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedRange === range
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Master Glass Dashboard Frame */}
          <GlassCard variant="elevated" hoverEffect={false} className="p-5 sm:p-7 md:p-8">
            {/* KPI Metric Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
              {currentMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="glass-panel-subtle p-4 sm:p-5 rounded-xl text-left"
                >
                  <div className="text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>{metric.label}</span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        metric.isPositive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {metric.change}
                    </span>
                  </div>

                  <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                    <AnimatedCounter value={metric.value} duration={0.8} />
                  </div>

                  <div className="mt-1 text-[11px] text-slate-500 truncate">
                    {metric.subtext}
                  </div>
                </div>
              ))}
            </div>

            {/* Main Interactive Workspace (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Visual Chart View (7 Cols) */}
              <div className="lg:col-span-7 glass-panel-subtle p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        Sales Velocity &amp; Revenue Growth
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-xs text-slate-400">
                          Live telemetry for {selectedRange}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          UPI 58% • Cash 24% • Card 18%
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          ⚡ Peak 6-9 PM
                        </span>
                      </div>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-[#0e1626]/80 border border-white/10 p-1 rounded-lg text-xs">
                      <button
                        onClick={() => setViewMode("sales")}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          viewMode === "sales"
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Velocity
                      </button>
                      <button
                        onClick={() => setViewMode("inventory")}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          viewMode === "inventory"
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Stock Health
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${selectedRange}-${viewMode}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >
                      {viewMode === "sales" ? (
                        <SalesChart data={currentChart} height={230} />
                      ) : (
                        <div className="py-4 space-y-3">
                          {DEMO_INVENTORY_ALERTS.map((item) => (
                            <div
                              key={item.name}
                              className="glass-panel p-3 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="truncate mr-3">
                                <div className="font-semibold text-white truncate">
                                  {item.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {item.stock} in stock • Runway:{" "}
                                  <span className="text-amber-400 font-semibold">
                                    {item.runwayDays} days
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  Reorder +{item.suggestedReorder}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                    IndexedDB 0ms cached query
                  </span>
                  <span className="text-slate-400">
                    Live chart rendered via SVG Bezier Engine
                  </span>
                </div>
              </div>

              {/* Right Column: Transactions & AI Briefing (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {/* AI Executive Briefing Mini-Card */}
                <div className="glass-panel-glow p-4 sm:p-5 rounded-2xl text-left border border-sky-400/25 bg-sky-500/[0.03]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      Gemini Copilot Briefing
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Gross sales up <span className="text-white font-semibold">14.2%</span>.
                    Specialty Gourmet items are outperforming expectations, but Basmati Rice
                    reorder point triggered (
                    <span className="text-amber-300 font-semibold">2.1 days</span> remaining).
                  </p>
                </div>

                {/* Live Transactions Feed */}
                <div className="glass-panel-subtle p-5 rounded-2xl text-left flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-white">Recent POS Sales</h4>
                    <span className="text-[11px] text-slate-500">Live Stream</span>
                  </div>

                  <div className="space-y-3">
                    {DEMO_TRANSACTIONS.slice(0, 4).map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-[#0e1626]/80 border border-white/[0.06] flex items-center justify-between text-xs hover:border-white/20 transition-colors"
                      >
                        <div className="truncate mr-2">
                          <div className="font-semibold text-slate-200 truncate">
                            {tx.product}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{tx.customer}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {paymentIcons[tx.paymentMethod]}
                              {tx.paymentMethod}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-white">
                            ₹{tx.amount.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-sky-400 font-medium">
                            {tx.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
};
