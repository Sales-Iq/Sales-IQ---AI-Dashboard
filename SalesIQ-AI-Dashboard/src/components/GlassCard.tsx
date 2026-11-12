import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "subtle" | "glow" | "elevated";
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = "default",
  children,
  className = "",
  hoverEffect = true,
  ...props
}) => {
  const variantClasses = {
    default: "glass-panel rounded-2xl",
    subtle: "glass-panel-subtle rounded-2xl",
    glow: "glass-panel-glow rounded-2xl",
    elevated: "bg-[#0e1626]/85 border border-sky-400/20 rounded-2xl shadow-glass-lg backdrop-blur-xl",
  }[variant];

  return (
    <motion.div
      whileHover={
        hoverEffect
          ? {
              y: -4,
              borderColor: "rgba(56, 189, 248, 0.45)",
              boxShadow: "0 20px 40px -15px rgba(14, 165, 233, 0.25)",
              transition: { duration: 0.25, ease: "easeOut" },
            }
          : undefined
      }
      className={`relative overflow-hidden transition-colors ${variantClasses} ${className}`}
      {...props}
    >
      {/* Specular Top Light Knockout */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
};
