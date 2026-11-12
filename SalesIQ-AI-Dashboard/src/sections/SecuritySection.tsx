import React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Lock, UserCheck, KeyRound, Check, X } from "lucide-react";
import { SectionHeading } from "../components/SectionHeading";
import { GlassCard } from "../components/GlassCard";

export const SecuritySection: React.FC = () => {
  const permissions = [
    {
      capability: "Point of Sale (POS) Billing",
      admin: true,
      staff: true,
      note: "Cashiers bill with instant transactional stock deductions",
    },
    {
      capability: "Personal Sales History & Commission",
      admin: true,
      staff: true,
      note: "Staff view their own daily receipts and targets",
    },
    {
      capability: "Read Available Stock Levels",
      admin: true,
      staff: true,
      note: "Staff see available units; cost rates and margins hidden",
    },
    {
      capability: "Create New Customer Profiles",
      admin: true,
      staff: true,
      note: "Frontline cashiers can link buyers during checkout",
    },
    {
      capability: "Modify Cost Prices & Margins",
      admin: true,
      staff: false,
      note: "Guarded by Cloud Firestore stockOnlyUpdate() security rules",
    },
    {
      capability: "View Financial Profit Reports & PDF Exports",
      admin: true,
      staff: false,
      note: "Executive analytics restricted strictly to Admins",
    },
    {
      capability: "Vendor Restock Purchase Inward Vouchers",
      admin: true,
      staff: false,
      note: "Procurement records isolated to authenticated managers",
    },
    {
      capability: "Staff Account Invitation & Deactivation",
      admin: true,
      staff: false,
      note: "Admins can instantly revoke active staff sessions",
    },
    {
      capability: "Gemini AI Key & Store Settings",
      admin: true,
      staff: false,
      note: "Private API keys and business parameters protected",
    },
  ];

  return (
    <section id="security" className="relative py-24 sm:py-32 px-5 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Role-Based Security & Governance"
          title="Enterprise control. Zero margin leaks."
          subtitle="SalesIQ enforces strict separation of concerns between business owners and front-line sales staff using Cloud Firestore security rules."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Security Architecture Summary (5 Cols) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 text-left space-y-5"
          >
            <GlassCard className="p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Cloud Firestore Security Rules
                  </h4>
                  <span className="text-xs text-slate-400">
                    Documented in firestore-rules.txt
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                Security is enforced at the database level, not merely in the browser UI.
                Even if staff inspect browser network requests, the Firestore database
                rejects unauthorized price edits or sensitive financial queries.
              </p>

              <div className="mt-5 p-3.5 rounded-xl bg-[#0e1626]/80 border border-white/5 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-sky-400">rule: stockOnlyUpdate()</div>
                <div className="text-slate-400">
                  allow update: if isStaff() &amp;&amp;
                </div>
                <div className="text-sky-300 pl-4">
                  request.resource.data.diff(resource.data).affectedKeys()
                </div>
                <div className="text-sky-300 pl-4">
                  .hasOnly([&apos;stock&apos;, &apos;status&apos;, &apos;updatedAt&apos;])
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Firebase Authentication &amp; Inactive Isolation
                  </h4>
                  <span className="text-xs text-slate-400">
                    Dual Email/Password + Google OAuth
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                Deactivated staff accounts are quarantined in real time. If an admin marks
                an employee inactive, their session is invalidated immediately, blocking
                access to all store data.
              </p>
            </GlassCard>
          </motion.div>

          {/* Right Column: RBAC Permission Matrix Table (7 Cols) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-7"
          >
            <GlassCard variant="elevated" hoverEffect={false} className="p-6 sm:p-7 text-left overflow-x-auto">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h4 className="text-sm font-bold text-white">
                  Role Privilege Matrix (RBAC)
                </h4>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="text-sky-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Admin
                  </span>
                  <span className="text-blue-400 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" /> Staff
                  </span>
                </div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {permissions.map((perm) => (
                  <div
                    key={perm.capability}
                    className="py-3 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                  >
                    <div className="max-w-xs sm:max-w-md">
                      <div className="font-semibold text-slate-200">
                        {perm.capability}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {perm.note}
                      </div>
                    </div>

                    <div className="flex items-center gap-8 flex-shrink-0">
                      <div className="w-6 text-center">
                        {perm.admin ? (
                          <Check className="w-4 h-4 text-sky-400 inline-block" />
                        ) : (
                          <X className="w-4 h-4 text-red-500 inline-block" />
                        )}
                      </div>

                      <div className="w-6 text-center">
                        {perm.staff ? (
                          <Check className="w-4 h-4 text-sky-400 inline-block" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 inline-block" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
