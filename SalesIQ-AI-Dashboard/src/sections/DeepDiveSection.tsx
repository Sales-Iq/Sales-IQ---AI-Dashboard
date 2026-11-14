import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Boxes,
  LineChart,
  Bot,
  PieChart,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import {
  DEMO_INVENTORY_ALERTS,
  DEMO_COPILOT_PROMPTS,
  AICopilotPrompt,
} from "../data/demoData";

export const DeepDiveSection: React.FC = () => {
  const [activePrompt, setActivePrompt] = useState<AICopilotPrompt>(
    DEMO_COPILOT_PROMPTS[0]
  );

  return (
    <section id="ai-analytics" className="scroll-mt-20 sm:scroll-mt-24 relative py-10 sm:py-14 px-5 sm:px-6 lg:px-8 overflow-hidden defer-render-section">
      <div className="max-w-7xl mx-auto space-y-12 md:space-y-16">
        {/* ============================================================== */}
        {/* DEEP DIVE 1: INVENTORY INTELLIGENCE                            */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Copy (5 Cols) */}
          <div className="lg:col-span-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 glass-pill text-emerald-400">
              <Boxes className="w-3.5 h-3.5" />
              <span>Real-Time Inventory</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Eliminate stockouts before they cost you revenue.
            </h3>

            <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed">
              SalesIQ continuously audits physical stock against real-time POS sales.
              Items crossing minimum safety thresholds instantly trigger visual warnings
              and inward restock purchase requisitions.
            </p>

            <ul className="mt-8 space-y-3.5 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>
                  <b>Tri-State Automated Badges:</b> Available (Emerald), Low Stock
                  (Amber), and Out of Stock (Crimson) computed live.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>
                  <b>Batch &amp; Expiry Tracking:</b> Multi-batch stock management for
                  perishable grocery goods and pharmaceuticals.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>
                  <b>Fast vs. Slow Mover Ranking:</b> Automatically ranks catalog items
                  by velocity so capital is never trapped in dead inventory.
                </span>
              </li>
            </ul>
          </div>

          {/* UI Mockup (7 Cols) */}
          <div className="lg:col-span-7">
            <GlassCard variant="elevated" hoverEffect={false} className="p-6 sm:p-7">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-bold text-white">
                    Live Stock Health Monitor
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Auto-sync active
                </span>
              </div>

              <div className="space-y-3">
                {DEMO_INVENTORY_ALERTS.map((item) => (
                  <div
                    key={item.name}
                    className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:border-white/20 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{item.category}]
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>Current: <b className="text-white">{item.stock} units</b></span>
                        <span>•</span>
                        <span>Velocity: {item.dailyVelocity} units/day</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">Runway</div>
                        <div
                          className={`text-xs font-black ${
                            item.runwayDays < 3
                              ? "text-red-400"
                              : item.runwayDays < 5
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {item.runwayDays} Days
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                          item.status === "Critical"
                            ? "bg-red-500/10 text-red-300 border-red-500/30"
                            : item.status === "Reorder Soon"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        Reorder +{item.suggestedReorder}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DEEP DIVE 2: PREDICTIVE DEMAND FORECASTING                     */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* UI Mockup (7 Cols) - Alternating on left */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <GlassCard variant="elevated" hoverEffect={false} className="p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
                <div>
                  <span className="text-sm font-bold text-white">
                    Demand Forecast Envelope
                  </span>
                  <p className="text-xs text-slate-400">
                    Product: Organic Himalayan Honey (1kg)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Algorithm: Moving ADS × 30d
                  </span>
                </div>
              </div>

              {/* Forecast Simulation Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="glass-panel p-3 rounded-xl text-left">
                  <div className="text-[10px] text-slate-400">Current Stock</div>
                  <div className="text-lg font-extrabold text-white mt-0.5">
                    18 units
                  </div>
                  <div className="text-[10px] text-emerald-400">Safe margin</div>
                </div>

                <div className="glass-panel p-3 rounded-xl text-left">
                  <div className="text-[10px] text-slate-400">Avg Daily Sales</div>
                  <div className="text-lg font-extrabold text-sky-400 mt-0.5">
                    2.8 units
                  </div>
                  <div className="text-[10px] text-slate-400">30d moving avg</div>
                </div>

                <div className="glass-panel p-3 rounded-xl text-left">
                  <div className="text-[10px] text-slate-400">Suggested PO</div>
                  <div className="text-lg font-extrabold text-amber-300 mt-0.5">
                    +75 units
                  </div>
                  <div className="text-[10px] text-slate-400">Lead time 3d</div>
                </div>
              </div>

              {/* Dual-Line Curve SVG Preview */}
              <div className="glass-panel-subtle p-4 rounded-xl relative">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 rounded bg-sky-400 inline-block" />
                    Historical Sales
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 rounded bg-violet-400 inline-block" />
                    Predicted Demand Curve
                  </span>
                </div>

                <svg viewBox="0 0 500 140" className="w-full h-auto overflow-visible">
                  <defs>
                    <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Past line */}
                  <path
                    d="M 20,100 Q 80,75 140,85 T 260,50"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Predicted dotted future line */}
                  <path
                    d="M 260,50 Q 320,30 380,42 T 480,20"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    strokeLinecap="round"
                  />

                  {/* Projection Horizon Mark */}
                  <line
                    x1="260"
                    y1="10"
                    x2="260"
                    y2="120"
                    stroke="rgba(255,255,255,0.2)"
                    strokeDasharray="3 3"
                  />
                  <text x="265" y="25" fill="#94A3B8" fontSize="10" fontFamily="sans-serif">
                    Today (Projection Horizon)
                  </text>
                </svg>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
                  <span>Day -14</span>
                  <span>Day -7</span>
                  <span>Today</span>
                  <span>Day +7</span>
                  <span>Day +14</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Copy (5 Cols) */}
          <div className="lg:col-span-5 text-left order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 glass-pill text-violet-400">
              <LineChart className="w-3.5 h-3.5" />
              <span>Predictive Demand Modeling</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Order precisely what you will sell. No guesswork.
            </h3>

            <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed">
              SalesIQ moves beyond static minimums. It mathematically evaluates your
              sales velocity across rolling 30, 60, and 90-day horizons to calculate
              safe reorder lead times before vendor purchase cycles close.
            </p>

            <div className="mt-6 p-4 rounded-xl glass-panel-subtle border border-white/5 font-mono text-xs text-slate-300 space-y-1.5">
              <div className="text-sky-400 font-semibold">
                ADS = Total Units Sold ÷ Window Days
              </div>
              <div className="text-sky-300">
                Stock Runway = Current Inventory ÷ ADS
              </div>
              <div className="text-slate-400">
                Suggested Reorder = (ADS × 30d) + Safety Buffer
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DEEP DIVE 3: AI BUSINESS COPILOT                               */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Copy (5 Cols) */}
          <div className="lg:col-span-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 badge-salesiq-info">
              <Bot className="w-3.5 h-3.5" />
              <span>Google Gemini Orchestrator</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Ask your database questions in plain English.
            </h3>

            <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed">
              Powered by a resilient multi-model Gemini cascade with automatic quota
              failover. Talk directly to your store's sales and stock data to uncover
              margin leaks, fast movers, and supplier price disparities.
            </p>

            {/* Interactive Prompt Selector Chips */}
            <div className="mt-8 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Try Example Business Prompts:
              </div>
              {DEMO_COPILOT_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => setActivePrompt(prompt)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                    activePrompt.id === prompt.id
                      ? "bg-sky-500/20 text-white border-sky-400/50 shadow-glow"
                      : "glass-panel-subtle text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="truncate mr-2">“{prompt.question}”</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 flex-shrink-0">
                    {prompt.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* UI Mockup (7 Cols) - Interactive Gemini Terminal */}
          <div className="lg:col-span-7">
            <GlassCard variant="elevated" hoverEffect={false} className="p-6 sm:p-7 text-left">
              {/* Terminal Window Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-bold text-white">
                    SalesIQ AI Copilot
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-sky-400 font-mono bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                  Model: Gemini 3.5 Flash (Active)
                </div>
              </div>

              {/* User Prompt Message */}
              <div className="mb-4 p-3.5 rounded-xl bg-[#0e1626]/80 border border-white/10 text-xs text-white flex items-center gap-2">
                <span className="font-bold text-sky-400">You:</span>
                <span>{activePrompt.question}</span>
              </div>

              {/* AI Generated Response Stream */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePrompt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activePrompt.answer.summary}
                  </p>

                  {/* Dynamic Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {activePrompt.answer.metrics.map((m) => (
                      <div key={m.label} className="glass-panel p-2.5 rounded-lg text-left">
                        <div className="text-[10px] text-slate-400">{m.label}</div>
                        <div className="text-xs font-bold text-sky-400 mt-0.5">
                          {m.value}
                        </div>
                        {m.badge && (
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            {m.badge}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Bullet points */}
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activePrompt.answer.bullets.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-sky-400">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Strategic Recommendation Callout */}
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-slate-200">
                    <span className="font-bold text-sky-400">Recommendation: </span>
                    {activePrompt.answer.recommendation}
                  </div>
                </motion.div>
              </AnimatePresence>
            </GlassCard>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DEEP DIVE 4: EXECUTIVE BUSINESS ANALYTICS                      */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* UI Mockup (7 Cols) - Alternating on left */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <GlassCard variant="elevated" hoverEffect={false} className="p-6 sm:p-7">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
                <span className="text-sm font-bold text-white">
                  Executive BI Intelligence Center
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Full fiscal breakdown
                </span>
              </div>

              {/* 4 Mini Analytical Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Panel 1: Top Selling Items */}
                <div className="glass-panel p-4 rounded-xl text-left">
                  <div className="text-xs font-bold text-white mb-3 flex items-center justify-between">
                    <span>Top Selling Items</span>
                    <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>1. Wireless ANC Earbuds</span>
                      <b className="text-white">₹89,970</b>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>2. Organic Himalayan Honey</span>
                      <b className="text-white">₹42,500</b>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>3. Extra Virgin Olive Oil</span>
                      <b className="text-white">₹31,000</b>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Category Breakdown */}
                <div className="glass-panel p-4 rounded-xl text-left">
                  <div className="text-xs font-bold text-white mb-3 flex items-center justify-between">
                    <span>Department Revenue</span>
                    <PieChart className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Gourmet &amp; Grocery</span>
                      <b className="text-sky-400">42%</b>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Consumer Electronics</span>
                      <b className="text-sky-400">31%</b>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Beverages &amp; Coffee</span>
                      <b className="text-violet-400">27%</b>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Monthly Growth Trajectory */}
                <div className="glass-panel p-4 rounded-xl text-left sm:col-span-2">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-white">
                      Cumulative Revenue Acceleration
                    </span>
                    <span className="text-sky-400 font-semibold">+22.4% MoM</span>
                  </div>
                  <div className="h-16 flex items-end gap-2 pt-2">
                    {[35, 48, 62, 75, 90, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-sky-500/30 to-blue-500 rounded-t transition-all hover:brightness-125"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
                    <span>Oct</span>
                    <span>Nov</span>
                    <span>Dec</span>
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar (Projected)</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Copy (5 Cols) */}
          <div className="lg:col-span-5 text-left order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 glass-pill text-sky-400">
              <PieChart className="w-3.5 h-3.5" />
              <span>Multi-Dimensional BI</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Five native analytical lenses on your store's health.
            </h3>

            <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed">
              Never wait for monthly accounting reconciliations. SalesIQ provides
              instant daily sales line charts, monthly revenue benchmarks, top-selling
              product rankings, category doughnut distributions, and revenue growth
              curves.
            </p>

            <div className="mt-8 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-lg glass-panel text-slate-300 font-medium">
                📄 Export to Vector PDF
              </span>
              <span className="px-3 py-1.5 rounded-lg glass-panel text-slate-300 font-medium">
                📊 Export to Excel (.xlsx)
              </span>
              <span className="px-3 py-1.5 rounded-lg glass-panel text-slate-300 font-medium">
                💾 CSV &amp; JSON API
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
