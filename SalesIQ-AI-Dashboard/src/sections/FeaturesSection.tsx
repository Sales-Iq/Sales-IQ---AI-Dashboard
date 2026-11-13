import React from "react";
import {
  CreditCard,
  Boxes,
  LineChart,
  Bot,
  FileSpreadsheet,
  UsersRound,
} from "lucide-react";
import { SectionHeading } from "../components/SectionHeading";
import { FeatureCard } from "../components/FeatureCard";

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: CreditCard,
      title: "Point of Sale & Billing",
      description:
        "Sub-millisecond barcode lookups, live inventory ceiling checks, multi-tender payments (UPI, Card, Cash), and instant thermal receipt printing.",
      badge: "Fast Checkout",
      accent: "mint" as const,
    },
    {
      icon: Boxes,
      title: "Real-Time Inventory",
      description:
        "Automated tri-state status tracking (Available, Low Stock, Out of Stock), multi-batch expiry dates, and AI spreadsheet bulk imports with zero manual formatting.",
      badge: "Stock Protection",
      accent: "teal" as const,
    },
    {
      icon: LineChart,
      title: "Predictive Demand Forecasting",
      description:
        "Calculates moving-window Average Daily Sales (ADS), estimates exact runway days until stockouts, and recommends optimal reorder quantities.",
      badge: "Machine Learning",
      accent: "violet" as const,
    },
    {
      icon: Bot,
      title: "AI Business Copilot",
      description:
        "Ask natural-language questions about profits, margins, and trends. Powered by a multi-model Google Gemini orchestrator with dynamic quota failover.",
      badge: "Gemini 3.5 & 3.8",
      accent: "mint" as const,
    },
    {
      icon: FileSpreadsheet,
      title: "Gross Profit & Real Margins",
      description:
        "Real-time wholesale cost auditing (Selling Price − Buy Cost), live tender splits (UPI, Cash, Card), and 24-hour rush-hour velocity heatmaps with PDF & Excel exports.",
      badge: "Real-Time Margins",
      accent: "gold" as const,
    },
    {
      icon: UsersRound,
      title: "Staff Performance & CRM",
      description:
        "Built-in cashier billing leaderboards, customer lifetime spend tracking, inward vendor purchase orders, and enterprise Role-Based Access Control (RBAC).",
      badge: "Staff Leaderboards",
      accent: "violet" as const,
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 px-5 sm:px-6 lg:px-8 defer-render-section">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Core Platform Capabilities"
          title="Everything your store needs. One intelligent system."
          subtitle="Engineered to replace fragmented cash register tools, manual notebooks, and clunky legacy ERP software with modern cloud intelligence."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              badge={feature.badge}
              accent={feature.accent}
              delay={i * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
