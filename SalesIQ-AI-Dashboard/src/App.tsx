import React from "react";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./sections/HeroSection";
import { ProductPreviewSection } from "./sections/ProductPreviewSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { DeepDiveSection } from "./sections/DeepDiveSection";
import { HowItWorksSection } from "./sections/HowItWorksSection";
import { IndustriesSection } from "./sections/IndustriesSection";
import { SecuritySection } from "./sections/SecuritySection";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";
import { useLenis } from "./hooks/useLenis";

export const App: React.FC = () => {
  // Initialize smooth inertia scrolling
  useLenis(true);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 selection:bg-sky-500 selection:text-white relative overflow-hidden font-sans">
      {/* Sticky Translucent Navbar */}
      <Navbar />

      {/* Main Page Flow */}
      <main>
        {/* A. Hero Section */}
        <HeroSection />

        {/* B. Interactive Product Preview */}
        <ProductPreviewSection />

        {/* C. 6-Card Capability Overview */}
        <FeaturesSection />

        {/* D. Deep-Dive Product Sections */}
        <DeepDiveSection />

        {/* E. How It Works (3 Connected Steps) */}
        <HowItWorksSection />

        {/* F. Built for Real Retail Operations */}
        <IndustriesSection />

        {/* G. Security & Operational Control */}
        <SecuritySection />

        {/* H. Atmospheric Final CTA */}
        <FinalCTA />
      </main>

      {/* I. Enterprise Dynamic Footer */}
      <Footer />
    </div>
  );
};

export default App;
