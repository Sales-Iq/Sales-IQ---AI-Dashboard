import React from "react";
import { motion } from "motion/react";
import { Link2, Activity, Lightbulb } from "lucide-react";
import { SectionHeading } from "../components/SectionHeading";
import { GlassCard } from "../components/GlassCard";

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: "01",
      icon: Link2,
      title: "Bring your operations together",
      description:
        "Catalog your merchandise, onboard cashiers with role-based permissions, record suppliers, and connect checkout counters to Cloud Firestore.",
      accent: "from-sky-500/20 to-blue-600/20",
      textColor: "text-sky-400",
      borderColor: "border-sky-500/30",
    },
    {
      number: "02",
      icon: Activity,
      title: "Understand what's happening",
      description:
        "Watch live sales register in under 50ms across branches. Receive automated alerts whenever fast-moving stock crosses low-level thresholds.",
      accent: "from-blue-500/20 to-violet-600/20",
      textColor: "text-blue-400",
      borderColor: "border-blue-500/30",
    },
    {
      number: "03",
      icon: Lightbulb,
      title: "Make smarter decisions",
      description:
        "Leverage mathematical demand velocity forecasting and Gemini AI briefings to order optimal inventory quantities and safeguard margins.",
      accent: "from-violet-500/20 to-purple-600/20",
      textColor: "text-violet-400",
      borderColor: "border-violet-500/30",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 px-5 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Workflow Architecture"
          title="How SalesIQ powers your store."
          subtitle="A unified three-phase operational cycle designed for zero-friction daily retail management."
        />

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="h-full"
              >
                <GlassCard
                  className={`h-full p-8 text-left relative flex flex-col justify-between hover:border-white/20`}
                >
                  <div>
                    {/* Top Step Pill & Large Number */}
                    <div className="flex items-center justify-between mb-8">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border ${step.borderColor} bg-gradient-to-br ${step.accent} ${step.textColor}`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-4xl font-black text-white/10 font-mono">
                        {step.number}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                      {step.title}
                    </h3>

                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span>Phase {step.number} Complete</span>
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
