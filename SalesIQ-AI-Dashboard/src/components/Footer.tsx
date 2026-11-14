import React from "react";
import { Terminal, Mail, Github, ArrowUpRight } from "lucide-react";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.08] bg-[#090d14]/80 backdrop-blur-md pt-12 pb-10 px-5 sm:px-6 lg:px-8 defer-render-section">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-white/[0.08]">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5 font-black text-2xl text-white tracking-tight mb-4 inline-block">
              <div className="w-9 h-9 rounded-xl logo-salesiq-mark flex items-center justify-center inline-flex">
                <span className="text-xs font-black tracking-widest text-white">
                  SIQ
                </span>
              </div>
              <span>
                Sales<span className="text-sky-400">IQ</span>
              </span>
            </a>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-5">
              AI-powered sales, inventory, and demand forecasting platform. 
              Built for retail stores, supermarkets, pharmacies, and multi-branch distribution.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <a
                href="https://github.com/Sales-Iq/Sales-IQ---AI-Dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel-subtle text-xs text-slate-300 hover:text-white hover:border-sky-500/40 transition-colors"
                title="View Open Repository on GitHub"
              >
                <Github className="w-3.5 h-3.5 text-slate-400" />
                <span>GitHub Source</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500" />
              </a>

              <a
                href="mailto:support@salesiq.app"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel-subtle text-xs text-slate-300 hover:text-white hover:border-sky-500/40 transition-colors"
                title="Contact SalesIQ Team"
              >
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>support@salesiq.app</span>
              </a>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel-subtle text-xs text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>Specification v2.4.0 • Enterprise Cloud Edition</span>
            </div>
          </div>

          {/* Column 1: Core Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="#preview" className="hover:text-white transition-colors">
                  Interactive Showcase
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Point of Sale (POS)
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Real-Time Inventory
                </a>
              </li>
              <li>
                <a href="#ai-analytics" className="hover:text-white transition-colors">
                  Predictive Forecasting
                </a>
              </li>
              <li>
                <a href="#ai-analytics" className="hover:text-white transition-colors">
                  Gemini AI Copilot
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Supported Industries */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Industries
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="#industries" className="hover:text-white transition-colors">
                  Supermarkets & Grocery
                </a>
              </li>
              <li>
                <a href="#industries" className="hover:text-white transition-colors">
                  Consumer Electronics
                </a>
              </li>
              <li>
                <a href="#industries" className="hover:text-white transition-colors">
                  Fashion & Apparel
                </a>
              </li>
              <li>
                <a href="#industries" className="hover:text-white transition-colors">
                  Pharmacy & Healthcare
                </a>
              </li>
              <li>
                <a href="#industries" className="hover:text-white transition-colors">
                  Wholesale Stockists
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Security & Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Security & Portals
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="#security" className="hover:text-white transition-colors">
                  Role-Based Access (RBAC)
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-white transition-colors">
                  Cloud Firestore Rules
                </a>
              </li>
              <li>
                <a href="/login.html" className="hover:text-sky-400 transition-colors">
                  Admin & Staff Sign In →
                </a>
              </li>
              <li>
                <a href="/register.html" className="hover:text-sky-400 transition-colors">
                  Create Account →
                </a>
              </li>
              <li>
                <a href="/poster.html" className="hover:text-white transition-colors">
                  Academic Presentation Poster
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {currentYear} SalesIQ Technologies Inc. All rights reserved. • Built with Cloud Firestore &amp; Google Gemini AI.
          </p>

          <p className="text-slate-400 text-center sm:text-right">
            Master of Computer Applications (MCA) Project Architecture • Documented in{" "}
            <a href="/salesiq_features.txt" target="_blank" className="text-slate-300 font-mono hover:underline">salesiq_features.txt</a>
          </p>
        </div>
      </div>
    </footer>
  );
};
