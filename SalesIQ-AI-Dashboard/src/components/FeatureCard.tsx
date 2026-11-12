import React from "react";
import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  accent?: "mint" | "violet" | "teal" | "gold";
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  badge,
  accent = "mint",
  delay = 0,
}) => {
  const accentStyles = {
    mint: {
      iconBg: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      hoverBorder: "hover:border-sky-400/50",
    },
    violet: {
      iconBg: "bg-violet-500/15 text-violet-400 border-violet-500/30",
      badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
      hoverBorder: "hover:border-violet-400/50",
    },
    teal: {
      iconBg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      hoverBorder: "hover:border-blue-400/50",
    },
    gold: {
      iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      hoverBorder: "hover:border-amber-400/50",
    },
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="h-full"
    >
      <GlassCard
        className={`h-full p-6 sm:p-7 flex flex-col justify-between ${accentStyles.hoverBorder}`}
      >
        <div>
          <div className="flex items-center justify-between mb-5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border ${accentStyles.iconBg}`}
            >
              <Icon className="w-6 h-6" />
            </div>

            {badge && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${accentStyles.badge}`}
              >
                {badge}
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2.5 tracking-tight">
            {title}
          </h3>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            {description}
          </p>
        </div>

        {/* Subtle bottom decorative light line */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Enterprise Ready</span>
          <span className="text-slate-400 group-hover:text-white transition-colors">
            Explored in v2.4 →
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
};
