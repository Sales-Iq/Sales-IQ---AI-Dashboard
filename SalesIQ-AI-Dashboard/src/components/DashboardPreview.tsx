import React from "react";
import { motion } from "motion/react";
import { Sparkles, TrendingUp, AlertTriangle, PackageCheck } from "lucide-react";
import { SalesChart } from "./SalesChart";
import { DEMO_CHARTS } from "../data/demoData";

export const DashboardPreview: React.FC = () => {
  const chartData = DEMO_CHARTS["Today"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-xl mx-auto perspective-1000"
    >
      {/* Ambient background reflection */}
      <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/20 via-blue-600/20 to-violet-600/20 rounded-3xl blur-2xl opacity-60 -z-10" />

      {/* Main Software Window */}
      <div className="glass-panel-glow rounded-2xl p-5 md:p-6 text-left relative overflow-hidden">
        {/* Top Window Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            <span className="ml-3 text-xs font-mono text-slate-400">
              SalesIQ • Executive Portal v2.4
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-sky-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            Cloud Firestore Live
          </div>
        </div>

        {/* Mini KPI Metric Chips */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="glass-panel-subtle p-3 rounded-xl">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Today Sales</span>
              <TrendingUp className="w-3 h-3 text-sky-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-white tracking-tight">
              ₹48,250
            </div>
            <div className="text-[10px] text-sky-400 font-medium">+14.2%</div>
          </div>

          <div className="glass-panel-subtle p-3 rounded-xl">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Orders</span>
              <PackageCheck className="w-3 h-3 text-sky-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-white tracking-tight">
              142
            </div>
            <div className="text-[10px] text-sky-400 font-medium">Avg ₹340</div>
          </div>

          <div className="glass-panel-subtle p-3 rounded-xl">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Low Stock</span>
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-white tracking-tight">
              3 items
            </div>
            <div className="text-[10px] text-amber-400 font-medium">Runway &lt; 3d</div>
          </div>
        </div>

        {/* Mini Live Sales Chart */}
        <div className="glass-panel-subtle p-3.5 rounded-xl mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Sales Velocity Curve (Hourly)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20">
              Peak: 19:00
            </span>
          </div>
          <SalesChart data={chartData} height={140} showLabels={false} />
        </div>

        {/* Real-time Inventory & AI Briefing Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Quick SKU Stock Status */}
          <div className="glass-panel-subtle p-3 rounded-xl flex items-center justify-between">
            <div className="truncate mr-2">
              <div className="text-xs font-semibold text-white truncate">
                Basmati Rice (5kg)
              </div>
              <div className="text-[10px] text-slate-400">4 units remaining</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
              Low Stock
            </span>
          </div>

          {/* Mini AI Insight Chip */}
          <div className="glass-panel-subtle p-3 rounded-xl flex items-start gap-2 border border-sky-400/25 bg-sky-500/[0.04]">
            <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-tight">
              <span className="font-semibold text-white">Gemini AI:</span> Weekend demand
              surge detected. Suggested reorder: 45 units.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
