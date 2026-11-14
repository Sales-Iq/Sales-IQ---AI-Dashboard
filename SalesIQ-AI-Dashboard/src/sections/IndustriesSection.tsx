import React from "react";
import { motion } from "motion/react";
import {
  ShoppingBag,
  Smartphone,
  Shirt,
  ActivitySquare,
  Truck,
  Users2,
  LucideIcon,
} from "lucide-react";
import { SectionHeading } from "../components/SectionHeading";
import { GlassCard } from "../components/GlassCard";
import { DEMO_INDUSTRIES } from "../data/demoData";

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag,
  Smartphone,
  Shirt,
  Cross: ActivitySquare,
  Truck,
  Users: Users2,
};

export const IndustriesSection: React.FC = () => {
  return (
    <section id="industries" className="scroll-mt-20 sm:scroll-mt-24 relative py-10 sm:py-14 px-5 sm:px-6 lg:px-8 defer-render-section">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Target Retail Environments"
          title="Built for real-world retail operations."
          subtitle="From high-frequency grocery aisles to high-ticket consumer electronics, SalesIQ adapts to your operational requirements."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {DEMO_INDUSTRIES.map((ind, i) => {
            const Icon = iconMap[ind.icon] || ShoppingBag;
            return (
              <motion.div
                key={ind.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="h-full"
              >
                <GlassCard className="h-full p-6 sm:p-7 text-left flex flex-col justify-between hover:border-sky-400/40">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center text-sky-400 border-sky-500/20">
                        <Icon className="w-5 h-5" />
                      </div>

                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full glass-pill text-slate-300">
                        {ind.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1 tracking-tight">
                      {ind.title}
                    </h3>

                    <div className="text-xs text-sky-400 font-medium mb-3">
                      {ind.subtitle}
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed">
                      {ind.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>Configured in Settings</span>
                    <span className="text-slate-400">Standard Schema</span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
