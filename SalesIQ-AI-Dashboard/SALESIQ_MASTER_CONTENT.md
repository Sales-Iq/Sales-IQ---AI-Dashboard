# SALESIQ — Master Platform & Website Content Specification

> **Pass 1 of 3 — Extraction & Editable Content Specification.** This document is the single source of truth for all public website copy, admin portal interfaces, staff point-of-sale terminals, system notifications, metadata, and operational workflows across the SalesIQ platform.
>
> Extraction date: 14 November 2026.
> Live Production URL: `https://sales-iq-201db.web.app` (Firebase Hosting).
> Repository Working Directory: `SalesIQ-AI-Dashboard`.

---

## 1. Missing Details & Content Gaps Requiring Input

The following gaps, unverified claims, and placeholder values were cataloged during the complete platform audit. Each item is indexed with a tracking ID and cross-referenced in its respective section below.

| ID | Gap / Issue | Status | Where It Appears | Input Required |
|---|---|---|---|---|
| GAP-01 | No public support telephone number is published on the landing page or portal footers. | `[MISSING]` | Landing page footer, Contact sections | Official support phone number in E.164 format (or confirm email-only support posture). |
| GAP-02 | No official WhatsApp Business link or click-to-chat integration for automated customer receipts. | `[MISSING]` | Billing receipt preview, Landing page | Business WhatsApp number/link, or confirm thermal receipt / browser print only. |
| GAP-03 | No official social media profiles (LinkedIn, X/Twitter, YouTube, GitHub) linked in the footer. | `[MISSING]` | Landing page footer, metadata | Official company/product social links and display handles. |
| GAP-04 | No statutory legal entity name, corporate registration number (CIN/LLPIN), or GSTIN in receipts. | `[MISSING]` | Thermal Invoice Print template, Settings | Official corporate legal name, registered trade address, and default GSTIN tax ID. |
| GAP-05 | No formal Terms of Service or Privacy Policy document published at dedicated URLs. | `[LEGAL REVIEW REQUIRED]` | Auth pages (`/login`, `/register`), Footer | Formal customer privacy policy and merchant terms of service for retail data. |
| GAP-06 | No dedicated Grievance Officer / Data Protection Officer contact listed. | `[LEGAL REVIEW REQUIRED]` | Footer, Auth compliance | Name, title, and contact email of the data compliance officer. |
| GAP-07 | Custom domain not yet linked (`sales-iq-201db.web.app` vs. custom production domain like `salesiq.app`). | `[NEEDS CONFIRMATION]` | Hosting configuration, DNS | Target custom domain and SSL verification details. |
| GAP-08 | Production Google Gemini API Key is configured via fallback mock / local developer key. | `[TECHNICAL VALUE]` | `js/gemini-service.js` | Dedicated Google Cloud Gemini API key for production quota allocation. |
| GAP-09 | Default store tax rate defaults to 0% if unconfigured in Business Settings. | `[NEEDS CONFIRMATION]` | `admin/settings.html`, POS billing | Confirm standard default tax rate (e.g. 5%, 12%, or 18% GST). |
| GAP-10 | Barcode scanner hardware compatibility notes and manual keyboard wedge documentation. | `[MISSING]` | POS terminals, Help documentation | Supported scanner types (USB HID POS scanners, Bluetooth 2D imagers). |
| GAP-11 | Demo seeder generates simulated sales that can be triggered in live accounts. | `[NEEDS CONFIRMATION]` | Admin Dashboard (`dashboard.html`) | Confirm whether "Generate 15 Demo Sales" button should remain accessible in production. |
| GAP-12 | Invoice sequence prefix defaults to "SIQ" without customized store branch identifiers. | `[NEEDS CONFIRMATION]` | `admin/settings.html`, POS terminals | Store-level sequence numbering format guidelines (e.g., `MUM-01-SIQ-`). |
| GAP-13 | Currency engine defaults to Indian Rupee (INR ₹) as system base across all tenants. | `[EXISTING]` | `js/shared.js`, Multi-currency engine | Confirm that all wholesale costs and multi-currency rates anchor to base INR ₹. |
| GAP-14 | Super Admin hardcoded master bypass email `boss@gmail.com` in security rules and auth. | `[SECURITY REVIEW]` | `firestore-rules.txt`, `js/account.js` | Confirm production Super Admin root email address before enterprise rollout. |

---

## 2. How to Use This Document

### 2.1 Status Legend

| Status | Meaning |
|---|---|
| `[EXISTING]` | Verified content currently rendered and operational in the codebase. Replace inside the "New content" block if an update is desired. |
| `[PLACEHOLDER]` | Stand-in text, mock transaction, or demo item that must not be treated as a permanent business fact. |
| `[MISSING]` | Standard retail or corporate detail absent from the codebase that must be provided. |
| `[NEEDS CONFIRMATION]` | Content exists in code but requires merchant verification, policy approval, or metric evidence. |
| `[CONFLICT]` | The same fact or copy is expressed inconsistently across different pages. Resolve globally. |
| `[LEGAL REVIEW REQUIRED]` | Content with contractual, privacy, or statutory implications requiring formal review. |
| `[TECHNICAL VALUE — DO NOT EDIT AS COPY]` | A critical route, API endpoint, Firebase collection key, CSS class, or formula. Editing breaks the app. |

### 2.2 Standard Field Template

- **Status**: The current state of the content item.
- **Purpose**: What functional or marketing role this text performs.
- **Location**: Page → Section → Component / Element ID.
- **Current content**: Exact verbatim copy from the source code.
- **New content**: The designated replacement block to edit.
- **Implementation reference**: File path, line number, or data variable.
- **Notes**: Formatting restrictions, character limits, or dynamic dependencies.

---

## 3. Master Table of Contents

- [1. Missing Details & Content Gaps Requiring Input](#1-missing-details--content-gaps-requiring-input)
- [2. How to Use This Document](#2-how-to-use-this-document)
- [4. Global Brand, Identity & System Configuration](#4-global-brand-identity--system-configuration)
- [5. SEO, Metadata & Social Sharing Defaults](#5-seo-metadata--social-sharing-defaults)
- [6. Shared Shell: Header, Navigation & Global Footer](#6-shared-shell-header-navigation--global-footer)
- [7. Public Marketing & Landing Website](#7-public-marketing--landing-website)
  - [7.1 Hero Section](#71-hero-section)
  - [7.2 Interactive Product Showcase](#72-interactive-product-showcase)
  - [7.3 Core Platform Capabilities](#73-core-platform-capabilities)
  - [7.4 Architectural Deep Dive](#74-architectural-deep-dive)
  - [7.5 Workflow Architecture (How It Works)](#75-workflow-architecture-how-it-works)
  - [7.6 Target Retail Environments (Industries)](#76-target-retail-environments-industries)
  - [7.7 Role-Based Security & Governance](#77-role-based-security--governance)
  - [7.8 Final Conversion CTA Band](#78-final-conversion-cta-band)
- [8. Authentication, Onboarding & User Profiles](#8-authentication-onboarding--user-profiles)
  - [8.1 Login Screen](#81-login-screen)
  - [8.2 Account Registration](#82-account-registration)
  - [8.3 Profile Management](#83-profile-management)
  - [8.4 404 Error Screen](#84-404-error-screen)
- [9. Admin Executive Portal](#9-admin-executive-portal)
  - [9.1 Executive Dashboard](#91-executive-dashboard)
  - [9.2 Real-Time Point of Sale (POS) Billing](#92-real-time-point-of-sale-pos-billing)
  - [9.3 Sales Audit Log & Order Ledger](#93-sales-audit-log--order-ledger)
  - [9.4 Inventory & SKU Management](#94-inventory--sku-management)
  - [9.5 Restock & Inward Purchases](#95-restock--inward-purchases)
  - [9.6 Contacts & Directory (Customers & Suppliers)](#96-contacts--directory-customers--suppliers)
  - [9.7 Advanced Analytics & Gross Margins](#97-advanced-analytics--gross-margins)
  - [9.8 Predictive Demand Forecasting Engine](#98-predictive-demand-forecasting-engine)
  - [9.9 AI Insights Copilot](#99-ai-insights-copilot)
  - [9.10 Real-Time Notifications Hub](#910-real-time-notifications-hub)
  - [9.11 Business Settings & Tenant Configuration](#911-business-settings--tenant-configuration)
  - [9.12 Team Administration & Access Control](#912-team-administration--access-control)
- [10. Sales Staff Field Portal](#10-sales-staff-field-portal)
  - [10.1 Staff Dashboard](#101-staff-dashboard)
  - [10.2 Staff High-Speed Counter POS](#102-staff-high-speed-counter-pos)
  - [10.3 Personal Sales History & Performance](#103-personal-sales-history--performance)
  - [10.4 Real-Time Catalog & Stock Checker](#104-real-time-catalog--stock-checker)
- [11. Technical, Routing & Architecture Reference](#11-technical-routing--architecture-reference)
- [12. Content Conflict & Inconsistency Register](#12-content-conflict--inconsistency-register)

---

## 4. Global Brand, Identity & System Configuration

### BRAND-NAME — Public Wordmark
- **Status**: `[EXISTING]`
- **Purpose**: Primary brand name rendered across marketing, navigation, document titles, and invoices.
- **Location**: Global → Navigation, Footer, Titles, Invoice Header
- **Current content**:
  > SalesIQ
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/Navbar.tsx` (`SalesIQ`); `src/components/Footer.tsx`; `index.html` (`<title>`)
- **Notes**: Standard branding renders "Sales" in bold slate-100 and "IQ" highlighted in cyan/sky-400.

### BRAND-LOGO-MARK — App Icon & Favicon Monogram
- **Status**: `[EXISTING]`
- **Purpose**: Three-letter geometric monogram badge used for the favicon, splash screen, and navbar mark.
- **Location**: Global → Logo Icon / Monogram Mark
- **Current content**:
  > SIQ
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/Navbar.tsx`; `login.html` (`<span class="auth-logo">SIQ</span>`); `admin/css/admin.css`
- **Notes**: Kept in uppercase inside a rounded square gradient container (`from-sky-500 to-indigo-600`).

### BRAND-TAGLINE — Canonical Platform Tagline
- **Status**: `[EXISTING]`
- **Purpose**: High-level value proposition displayed in the hero headline and social sharing previews.
- **Location**: Hero headline / Landing page meta
- **Current content**:
  > Run your retail business with clarity.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/HeroSection.tsx` (Lines 35–38)
- **Notes**: In the hero section, the word "clarity." is rendered in a vivid three-stop linear gradient (`from-sky-400 via-blue-500 to-violet-400`).

### BRAND-PITCH — One-Sentence Positioning Statement
- **Status**: `[EXISTING]`
- **Purpose**: Canonical elevator pitch used across metadata, marketing cards, and documentation.
- **Location**: Hero subtitle / Meta description / Footer brand description
- **Current content**:
  > Connect sales, inventory, forecasting, and AI-powered insights in one intelligent retail management platform.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/HeroSection.tsx` (Lines 48–50); `index.html` (`<meta name="description">`)

### BRAND-EDITION-SPEC — Technical Version Badge
- **Status**: `[EXISTING]`
- **Purpose**: Technical specification badge rendered on the executive dashboard and landing footer.
- **Location**: Footer / Dashboard subheader
- **Current content**:
  > Specification v2.4.0 • Enterprise Cloud Edition
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/Footer.tsx` (Line 31); `src/components/DashboardPreview.tsx` (`SalesIQ • Executive Portal v2.4`)

---

## 5. SEO, Metadata & Social Sharing Defaults

### SEO-DEFAULT-TITLE — Browser Page Title
- **Status**: `[EXISTING]`
- **Purpose**: Root HTML `<title>` tag for search engine result pages and browser tabs.
- **Location**: `index.html` → `<head>` → `<title>`
- **Current content**:
  > SalesIQ — Run your retail business with clarity.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (Line 6)

### SEO-META-DESCRIPTION — Global Meta Description
- **Status**: `[EXISTING]`
- **Purpose**: Search engine summary snippet.
- **Location**: `index.html` → `<head>` → `<meta name="description">`
- **Current content**:
  > SalesIQ is an AI-powered sales, inventory, and demand forecasting platform for modern retail businesses.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (Line 7)

### SEO-THEME-COLOR — Mobile Browser Chrome Color
- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Sets the color of the browser status bar and viewport frame on iOS Safari and Android Chrome.
- **Location**: `index.html`, `login.html`, `register.html`
- **Current content**:
  > #090d14
- **New content**:
  > #090d14
- **Implementation reference**: `index.html` (Line 8); `login.html` (Line 13: `#0f172a`)

---

## 6. Shared Shell: Header, Navigation & Global Footer

### NAV-MENU-ITEMS — Main Navigation Links
- **Status**: `[EXISTING]`
- **Purpose**: Top navigation anchors allowing visitors to jump to landing page sections.
- **Location**: Global → Navigation Bar (`src/components/Navbar.tsx`)
- **Current content**:
  1. `Features` → `#features`
  2. `Interactive Demo` → `#preview`
  3. `How It Works` → `#how-it-works`
  4. `AI & Analytics` → `#ai-analytics`
  5. `Industries` → `#industries`
  6. `Security` → `#security`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/Navbar.tsx` (Lines 11–18)

### NAV-AUTH-BUTTONS — Header Action Controls
- **Status**: `[EXISTING]`
- **Purpose**: Direct CTA buttons to enter the application.
- **Location**: Navbar top-right
- **Current content**:
  - Sign In: `Sign In` → links to `login.html`
  - Get Started: `Get Started →` → links to `register.html`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/Navbar.tsx` (Lines 66–75)

### FOOTER-COPYRIGHT — Legal Attribution
- **Status**: `[EXISTING]`
- **Purpose**: Formal copyright statement at the bottom of the public website.
- **Location**: `src/components/Footer.tsx` (Lines 135–139)
- **Current content**:
  > © 2026 SalesIQ Technologies Inc. All rights reserved.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/Footer.tsx` (Line 136)

---

## 7. Public Marketing & Landing Website

### 7.1 Hero Section

#### HERO-EYEBROW — Eyebrow Pill
- **Status**: `[EXISTING]`
- **Purpose**: Top pill badge introducing the core domain authority.
- **Location**: Hero Section → Eyebrow
- **Current content**:
  > AI-POWERED RETAIL OPERATIONS
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/HeroSection.tsx` (Line 25)

#### HERO-TITLE — Primary Display Headline
- **Status**: `[EXISTING]`
- **Purpose**: Main hero value proposition.
- **Location**: Hero Section → `<h1>`
- **Current content**:
  > Run your retail business with clarity.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/HeroSection.tsx` (Lines 35–38)

#### HERO-SUBTITLE — Descriptive Copy
- **Status**: `[EXISTING]`
- **Purpose**: Supporting explanation clarifying product scope.
- **Location**: Hero Section → Paragraph
- **Current content**:
  > Connect sales, inventory, forecasting, and AI-powered insights in one intelligent retail management platform.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/HeroSection.tsx` (Lines 48–50)

#### HERO-CTA-PRIMARY — Primary Action Button
- **Status**: `[EXISTING]`
- **Purpose**: Direct user to test the interactive preview.
- **Location**: Hero Section → Primary Button
- **Current content**:
  > Explore SalesIQ →
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/HeroSection.tsx` (Lines 63–64)

#### HERO-CTA-SECONDARY — Secondary Action Button
- **Status**: `[EXISTING]`
- **Purpose**: Direct user to the workflow architecture section.
- **Location**: Hero Section → Secondary Glass Button
- **Current content**:
  > See How It Works
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/HeroSection.tsx` (Line 71)

#### HERO-PILLARS — Platform Capability Strip
- **Status**: `[EXISTING]`
- **Purpose**: Three core technical badges highlighting infrastructure resilience.
- **Location**: Hero Section → Capability Row
- **Current content**:
  1. `Cloud Firestore Realtime` (Icon: Zap)
  2. `Multi-Model Gemini AI` (Icon: Cpu)
  3. `0ms 3-Tier Cache` (Icon: Shield)
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/HeroSection.tsx` (Lines 82–93)

---

### 7.2 Interactive Product Showcase

#### PREVIEW-HEADING — Showcase Section Title
- **Status**: `[EXISTING]`
- **Purpose**: Introduces the live interactive product demonstration.
- **Location**: Showcase Section → SectionHeading
- **Current content**:
  - Eyebrow: `Interactive Product Showcase`
  - Title: `See your operations in motion.`
  - Subtitle: `Toggle live time horizons, inspect daily cashflow velocity, and test AI demand predictions.`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/ProductPreviewSection.tsx` (Lines 40–44)

#### PREVIEW-RANGES — Time Horizon Selector Tabs
- **Status**: `[EXISTING]`
- **Purpose**: Interactive filter pills toggling between historical demo periods.
- **Location**: Showcase Section → Filter Controls
- **Current content**:
  - `Today`
  - `Last 7 Days`
  - `Last 30 Days`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/demoData.ts` (`DEMO_RANGES`)

#### PREVIEW-METRICS — Simulated Retail KPIs
- **Status**: `[EXISTING]`
- **Purpose**: Metrics displayed in the live interactive showcase.
- **Location**: Showcase Section → Metric Cards
- **Current content**:
  - **Today Range**:
    - Revenue: `₹48,250` (+14.2% vs yesterday)
    - Orders: `142` (Average ticket: ₹340)
    - Net Margin: `32.4%` (Gross profit: ₹15,630)
    - Low Stock: `3 items` (Runway < 3 days)
  - **7 Days Range**:
    - Revenue: `₹3,42,800` (+8.7% vs previous week)
    - Orders: `984` (Average ticket: ₹348)
    - Net Margin: `31.8%` (Gross profit: ₹1,08,940)
    - Low Stock: `4 items` (Runway < 3 days)
  - **30 Days Range**:
    - Revenue: `₹14,85,600` (+12.3% vs previous month)
    - Orders: `4,210` (Average ticket: ₹352)
    - Net Margin: `33.1%` (Gross profit: ₹4,91,730)
    - Low Stock: `2 items` (Runway < 3 days)
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/demoData.ts` (`DEMO_METRICS`)

---

### 7.3 Core Platform Capabilities

#### FEATURES-HEADING — Section Heading
- **Status**: `[EXISTING]`
- **Purpose**: Sets up the 6-card feature matrix.
- **Location**: Features Section → SectionHeading
- **Current content**:
  - Eyebrow: `Core Platform Capabilities`
  - Title: `Everything your store needs. One intelligent system.`
  - Subtitle: `Engineered to replace fragmented cash register tools, manual notebooks, and clunky legacy ERP software with modern cloud intelligence.`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/FeaturesSection.tsx` (Lines 69–72)

#### FEATURE-CARD-1 — Point of Sale & Billing
- **Status**: `[EXISTING]`
- **Badge**: `Fast Checkout`
- **Title**: `Point of Sale & Billing`
- **Description**:
  > Sub-millisecond barcode lookups, live inventory ceiling checks, multi-tender payments (UPI, Card, Cash), and instant thermal receipt printing.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/FeaturesSection.tsx` (Lines 16–22)

#### FEATURE-CARD-2 — Real-Time Inventory
- **Status**: `[EXISTING]`
- **Badge**: `Stock Protection`
- **Title**: `Real-Time Inventory`
- **Description**:
  > Automated tri-state status tracking (Available, Low Stock, Out of Stock), multi-batch expiry dates, and AI spreadsheet bulk imports with zero manual formatting.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/FeaturesSection.tsx` (Lines 24–30)

#### FEATURE-CARD-3 — Predictive Demand Forecasting
- **Status**: `[EXISTING]`
- **Badge**: `Machine Learning`
- **Title**: `Predictive Demand Forecasting`
- **Description**:
  > Calculates moving-window Average Daily Sales (ADS), estimates exact runway days until stockouts, and recommends optimal reorder quantities.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/FeaturesSection.tsx` (Lines 32–38)

#### FEATURE-CARD-4 — AI Business Copilot
- **Status**: `[EXISTING]`
- **Badge**: `Gemini 3.5 & 3.8`
- **Title**: `AI Business Copilot`
- **Description**:
  > Ask natural-language questions about profits, margins, and trends. Powered by a multi-model Google Gemini orchestrator with dynamic quota failover.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/FeaturesSection.tsx` (Lines 40–46)

#### FEATURE-CARD-5 — Gross Profit & Real Margins
- **Status**: `[EXISTING]`
- **Badge**: `Real-Time Margins`
- **Title**: `Gross Profit & Real Margins`
- **Description**:
  > Real-time wholesale cost auditing (Selling Price − Buy Cost), live tender splits (UPI, Cash, Card), and 24-hour rush-hour velocity heatmaps with PDF & Excel exports.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/FeaturesSection.tsx` (Lines 48–54)

#### FEATURE-CARD-6 — Staff Performance & CRM
- **Status**: `[EXISTING]`
- **Badge**: `Staff Leaderboards`
- **Title**: `Staff Performance & CRM`
- **Description**:
  > Built-in cashier billing leaderboards, customer lifetime spend tracking, inward vendor purchase orders, and enterprise Role-Based Access Control (RBAC).
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/sections/FeaturesSection.tsx` (Lines 56–62)

---

### 7.4 Architectural Deep Dive

#### DEEPDIVE-1 — Inventory Health & Stockout Elimination
- **Status**: `[EXISTING]`
- **Badge**: `Real-Time Inventory`
- **Title**: `Eliminate stockouts before they cost you revenue.`
- **Body**:
  > SalesIQ continuously audits physical stock against real-time POS sales. Items crossing minimum safety thresholds instantly trigger visual warnings and inward restock purchase requisitions.
- **Bullet Points**:
  1. **Tri-State Automated Badges:** Available (Emerald), Low Stock (Amber), and Out of Stock (Crimson) computed live.
  2. **Batch & Expiry Tracking:** Multi-batch stock management for perishable grocery goods and pharmaceuticals.
  3. **Fast vs. Slow Mover Ranking:** Automatically ranks catalog items by velocity so capital is never trapped in dead inventory.
- **Implementation reference**: `src/sections/DeepDiveSection.tsx` (Lines 33–70)

#### DEEPDIVE-2 — Mathematical Demand Forecasting
- **Status**: `[EXISTING]`
- **Badge**: `Demand Velocity Engine`
- **Title**: `Forecast demand with mathematical certainty.`
- **Body**:
  > No more guesswork replenishment. SalesIQ calculates historical velocity curves across configurable 7, 14, 30, and 90-day time horizons to compute accurate reorder quantities.
- **Bullet Points**:
  1. **Average Daily Sales (ADS):** Dynamic moving average weighted toward recent sales surges.
  2. **Depletion Runway Projection:** Computes exact calendar date when remaining units reach zero.
  3. **Supplier Lead-Time Buffers:** Automatically incorporates vendor fulfillment days into reorder quantity calculations.
- **Implementation reference**: `src/sections/DeepDiveSection.tsx`

#### DEEPDIVE-3 — Autonomous Gemini Copilot
- **Status**: `[EXISTING]`
- **Badge**: `AI Business Analyst`
- **Title**: `Your own retail strategist, available 24/7.`
- **Body**:
  > Synthesizes thousands of sales transactions, SKU margins, and supplier purchase orders into clear, conversational action items.
- **Curated Prompt Examples**:
  1. *"Which products should I restock first this week?"*
  2. *"How can I improve gross profit margins without hurting volume?"*
  3. *"Which slow-moving items should be discounted or bundled?"*
- **Implementation reference**: `src/sections/DeepDiveSection.tsx`; `src/data/demoData.ts` (`DEMO_COPILOT_PROMPTS`)

---

### 7.5 Workflow Architecture (How It Works)

#### HOW-IT-WORKS-HEADING — Section Title
- **Status**: `[EXISTING]`
- **Eyebrow**: `Workflow Architecture`
- **Title**: `How SalesIQ powers your store.`
- **Subtitle**: `A unified three-phase operational cycle designed for zero-friction daily retail management.`
- **Implementation reference**: `src/sections/HowItWorksSection.tsx` (Lines 44–48)

#### STEP-01 — Bring Your Operations Together
- **Number**: `01`
- **Title**: `Bring your operations together`
- **Description**:
  > Catalog your merchandise, onboard cashiers with role-based permissions, record suppliers, and connect checkout counters to Cloud Firestore.
- **Implementation reference**: `src/sections/HowItWorksSection.tsx` (Lines 9–18)

#### STEP-02 — Understand What's Happening
- **Number**: `02`
- **Title**: `Understand what's happening`
- **Description**:
  > Watch live sales register in under 50ms across branches. Receive automated alerts whenever fast-moving stock crosses low-level thresholds.
- **Implementation reference**: `src/sections/HowItWorksSection.tsx` (Lines 20–28)

#### STEP-03 — Make Smarter Decisions
- **Number**: `03`
- **Title**: `Make smarter decisions`
- **Description**:
  > Leverage mathematical demand velocity forecasting and Gemini AI briefings to order optimal inventory quantities and safeguard margins.
- **Implementation reference**: `src/sections/HowItWorksSection.tsx` (Lines 30–38)

---

### 7.6 Target Retail Environments (Industries)

#### INDUSTRIES-HEADING — Section Title
- **Status**: `[EXISTING]`
- **Eyebrow**: `Target Retail Environments`
- **Title**: `Built for real-world retail operations.`
- **Subtitle**: `From high-frequency grocery aisles to high-ticket consumer electronics, SalesIQ adapts to your operational requirements.`
- **Implementation reference**: `src/sections/IndustriesSection.tsx` (Lines 29–33)

#### INDUSTRY-1 — Supermarkets & Grocery
- **Badge**: `High Velocity`
- **Title**: `Supermarkets & Grocery`
- **Subtitle**: `High-SKU Counts & Batch Expiry Tracking`
- **Description**:
  > Real-time FEFO (First-Expiry-First-Out) batch management, barcode checkout, and instant stock deduction preventing perishable inventory shrinkage.
- **Implementation reference**: `src/data/demoData.ts` (`DEMO_INDUSTRIES[0]`)

#### INDUSTRY-2 — Consumer Electronics
- **Badge**: `High Value`
- **Title**: `Consumer Electronics`
- **Subtitle**: `Serial Tracking & Gross Margin Auditing`
- **Description**:
  > Precise wholesale margin tracking, warranty registration notes, and high-ticket sales performance analytics for accessories and hardware.
- **Implementation reference**: `src/data/demoData.ts` (`DEMO_INDUSTRIES[1]`)

#### INDUSTRY-3 — Fashion & Boutiques
- **Badge**: `Multi-Variant`
- **Title**: `Fashion & Boutiques`
- **Subtitle**: `Apparel, Sizes, Colors & Seasonal Cycles`
- **Description**:
  > Clear visibility into seasonal inventory movement, customer repeat visit tracking, and dead-stock clearance discounting recommendations.
- **Implementation reference**: `src/data/demoData.ts` (`DEMO_INDUSTRIES[2]`)

#### INDUSTRY-4 — Pharmacy & Healthcare
- **Badge**: `Compliance`
- **Title**: `Pharmacy & Healthcare`
- **Subtitle**: `Medicines, Batch Codes & Safety Thresholds`
- **Description**:
  > Strict batch numbering, manufacturing and expiry date logging, and safety stockout alerts for critical healthcare inventory.
- **Implementation reference**: `src/data/demoData.ts` (`DEMO_INDUSTRIES[3]`)

#### INDUSTRY-5 — Wholesale Stockists & Distribution
- **Badge**: `B2B Invoicing`
- **Title**: `Wholesale Stockists`
- **Subtitle**: `Inward Purchase Orders & Bulk Pricing`
- **Description**:
  > Inward restock purchase tracking, supplier payment status ledgers, and exportable financial documentation for tax compliance.
- **Implementation reference**: `src/data/demoData.ts` (`DEMO_INDUSTRIES[4]`)

#### INDUSTRY-6 — Multi-Outlet Retailers
- **Badge**: `Centralized`
- **Title**: `Multi-Outlet Chains`
- **Subtitle**: `Unified Inventory & Distributed Staff POS`
- **Description**:
  > Centralized admin dashboard overseeing independent branch billing counters with role-isolated credentials and consolidated earnings reports.
- **Implementation reference**: `src/data/demoData.ts` (`DEMO_INDUSTRIES[5]`)

---

### 7.7 Role-Based Security & Governance

#### SECURITY-HEADING — Section Title
- **Status**: `[EXISTING]`
- **Eyebrow**: `Role-Based Security & Governance`
- **Title**: `Enterprise control. Zero margin leaks.`
- **Subtitle**: `SalesIQ enforces strict separation of concerns between business owners and front-line sales staff using Cloud Firestore security rules.`
- **Implementation reference**: `src/sections/SecuritySection.tsx` (Lines 68–72)

#### SECURITY-CAPABILITY-MATRIX — Permission Tiers
- **Status**: `[EXISTING]`
- **Purpose**: Public transparency table clarifying permissions between Admin and Staff.
- **Location**: Security Section → Permissions Grid
- **Permissions**:
  1. **Point of Sale (POS) Billing**: Admin: Yes | Staff: Yes (*Cashiers bill with instant transactional stock deductions*)
  2. **Personal Sales History & Commission**: Admin: Yes | Staff: Yes (*Staff view their own daily receipts and targets*)
  3. **Read Available Stock Levels**: Admin: Yes | Staff: Yes (*Staff see available units; cost rates and margins hidden*)
  4. **Create New Customer Profiles**: Admin: Yes | Staff: Yes (*Frontline cashiers can link buyers during checkout*)
  5. **Modify Cost Prices & Margins**: Admin: Yes | Staff: **No** (*Guarded by Cloud Firestore stockOnlyUpdate() security rules*)
  6. **View Financial Profit Reports & PDF Exports**: Admin: Yes | Staff: **No** (*Executive analytics restricted strictly to Admins*)
  7. **Vendor Restock Purchase Inward Vouchers**: Admin: Yes | Staff: **No** (*Procurement records isolated to authenticated managers*)
  8. **Staff Account Invitation & Deactivation**: Admin: Yes | Staff: **No** (*Admins can instantly revoke active staff sessions*)
  9. **Gemini AI Key & Store Settings**: Admin: Yes | Staff: **No** (*Private API keys and business parameters protected*)
- **Implementation reference**: `src/sections/SecuritySection.tsx` (Lines 9–63)

---

### 7.8 Final Conversion CTA Band

#### FINAL-CTA-TITLE — Action Headline
- **Status**: `[EXISTING]`
- **Title**: `Make your next retail decision a smarter one.`
- **Subtitle**:
  > Bring your sales, inventory, and business intelligence into one connected workspace. Experience real-time Firebase synchronization and autonomous Gemini AI insights today.
- **Primary Button**: `Get Started Free →` → links to `register.html`
- **Secondary Button**: `Launch Live Demo` → links to `#preview`
- **Implementation reference**: `src/components/FinalCTA.tsx` (Lines 35–65)

---

## 8. Authentication, Onboarding & User Profiles

### 8.1 Login Screen (`login.html`)

#### AUTH-LOGIN-TITLE — Page Title & Subtitle
- **Status**: `[EXISTING]`
- **Title**: `Welcome Back`
- **Subtitle**: `Login to your AI sales and inventory dashboard.`
- **Form Inputs**:
  - Email: `Email` (Placeholder: `you@example.com`)
  - Password: `Password` (Placeholder: `Enter password`)
- **Submit Button**: `Login`
- **Divider Text**: `OR`
- **Google OAuth**: `Continue with Google` (3D Glass Button)
- **Secondary Links**:
  - `Forgot password?` (Triggers email reset prompt)
  - `Create Account` → `register.html`
  - `← Back to home` → `index.html`
- **Implementation reference**: `login.html`; `js/auth.js`

---

### 8.2 Account Registration (`register.html`)

#### AUTH-REGISTER-TITLE — Registration Copy
- **Status**: `[EXISTING]`
- **Title**: `Create Account`
- **Subtitle**: `Register as Admin or Sales Staff.`
- **Form Inputs**:
  - Full Name: `Full Name` (Placeholder: `Your name`)
  - Email: `Email` (Placeholder: `you@example.com`)
  - Password: `Password` (Placeholder: `At least 6 characters`, `minlength="6"`)
  - Role Selector: `Role` (Options: `Admin`, `Sales Staff`)
- **Submit Button**: `Create Account`
- **Google OAuth**: `Register with Google`
- **Bottom Link**: `Already have account? Login`
- **Implementation reference**: `register.html`; `js/auth.js`

---

### 8.3 Profile Management (`profile.html`)

#### PROFILE-FIELDS — User Profile Controls
- **Status**: `[EXISTING]`
- **Purpose**: Allows logged-in users to update display names, customize profile pictures, and copy tenant IDs.
- **Fields**:
  - Display Name (`#profileName`)
  - Email Address (`#profileEmail`, Disabled)
  - Profile Photo URL (`#profilePhoto`, Supports DiceBear / Gravatar / image links)
  - Primary Button: `Update Profile`
  - Secondary Actions: `Toggle Dark/Light` (`#profileTheme`), `Logout` (`#profileLogout`, Red accent)
  - Navigation: `Back to Dashboard` (Dynamically directs to `/admin/dashboard.html` or `/sales/dashboard.html` based on role)
- **Implementation reference**: `profile.html`; `js/profile.js`

---

### 8.4 404 Error Screen (`404.html`)

#### ERROR-404-COPY — Page Not Found Notice
- **Status**: `[EXISTING]`
- **Title**: `404 - Page Not Found`
- **Heading**: `Lost in the Cloud?`
- **Description**: `The retail page, report, or resource you are looking for has moved or does not exist.`
- **Action Buttons**:
  - `Return to Home` → `index.html`
  - `Go to Dashboard` → `login.html`
- **Implementation reference**: `404.html`

---

## 9. Admin Executive Portal

### 9.1 Executive Dashboard (`admin/dashboard.html`)

#### ADMIN-DASHBOARD-KPIS — Top KPI Stat Tiles
- **Status**: `[EXISTING]`
- **Tile 1 (Today Sales)**:
  - Label: `Today Sales`
  - Value: Dynamic sum of all sales matching local `toLocalYMD(new Date())`
  - Hint: `X orders today`
- **Tile 2 (Monthly Revenue)**:
  - Label: `Monthly Revenue`
  - Value: Dynamic sum of current month sales
  - Hint: `X orders this month`
- **Tile 3 (Low Stock Items)**:
  - Label: `Low Stock Items`
  - Value: Count of products where `stock <= minStock && stock > 0`
  - Hint: `Reorder recommended`
- **Tile 4 (Out of Stock SKUs)**:
  - Label: `Out of Stock`
  - Value: Count of products where `stock <= 0`
  - Hint: `Immediate restock required`
- **Implementation reference**: `admin/js/dashboard.js` (`renderStats`)

#### ADMIN-DASHBOARD-CHARTS — Visual Analytics Tiles
- **Status**: `[EXISTING]`
- **Sales Trend Curve**:
  - Title: `Sales Velocity Trend`
  - Subtitle: Dynamic date range display (e.g. `Showing sales from 15 Oct to 14 Nov • X orders`)
  - Date Controls: Interactive Start & End date pickers with +1 / -1 day stepping arrows
  - Presets: `7 Days`, `30 Days`, `90 Days`, `All Time`
- **Operations & Cashier Leaderboard Tile**:
  - Subtitle: Dynamic based on active sub-tab:
    - Staff tab: *"Cashier & staff billing leaderboard today"*
    - Tender tab: *"Payment tender breakdown (UPI, Cash, Card)"*
    - Rush tab: *"24-Hour rush-hour sales velocity & peak footfall"*
  - Sub-Tabs: `Staff Leaderboard`, `Payment Tender`, `Rush Hour Velocity`
- **AI Business Summary Card**:
  - Title: `Gemini AI Operational Summary`
  - Action: `Open Copilot →` → links to `ai-insights.html`
- **Implementation reference**: `admin/js/dashboard.js`

---

### 9.2 Real-Time Point of Sale (POS) Billing (`admin/add-sale.html`)

#### POS-BILLING-TERMINAL — Invoicing Fields & Live Receipt
- **Status**: `[EXISTING]`
- **Inputs**:
  - Product Dropdown (`#saleProduct`): Shows name and current live stock (e.g. `Basmati Rice (5kg) — 18 in stock`)
  - Billing Quantity (`#saleQty`): Integer number picker with live ceiling check
  - Unit Price (`#salePrice`): Auto-filled from product master, converted to selected tenant currency
  - Available Stock (`#saleStock`): Read-only badge
  - Total Calculated Amount (`#saleTotal`): Auto-calculated `qty * unitPrice`
  - Customer Name (`#customerName`): Optional buyer name; automatically aggregates lifetime spend
  - Payment Tender (`#paymentMethod`): Options: `Cash`, `UPI / QR Code`, `Card`, `Credit / Due`
  - Transaction Date (`#saleDate`): Defaults to local date string; editable for historical entry
- **Live Receipt Preview (`#invoicePreview`)**:
  - Shows business logo, store title, generated invoice number (`SIQ-XXXXXXXX`), item, quantity, total amount, customer name, and payment method.
- **Actions**:
  - `Complete Sale ✓` (Features interactive morphing button state)
  - `Print Thermal Invoice` (Opens branded window for thermal ESC/POS or 80mm printers)
- **Implementation reference**: `admin/js/add-sale.js`

---

### 9.3 Sales Audit Log & Order Ledger (`admin/sales.html`)

#### SALES-LOG-TABLE — Order Transaction Columns
- **Status**: `[EXISTING]`
- **Columns**:
  1. `Invoice No`: Monospace identifier (e.g. `SIQ-84920112`)
  2. `Product`: Item name and category
  3. `Quantity`: Sold unit count
  4. `Total Amount`: Gross price charged in tenant currency
  5. `Salesperson`: Billed cashier name with role badge
  6. `Source`: `Staff Portal`, `Admin Terminal`, or `Live Demo` badge
  7. `Payment`: Tender pill (`Cash`, `UPI`, `Card`)
  8. `Action`: `🗑️ Delete` (Safely restores inventory stock and batch counts)
- **Filters**:
  - Date Filter (`#dateFilter`)
  - Cashier Filter (`#salespersonFilter`)
  - Payment Tender Filter (`#paymentFilter`)
  - `Export to CSV` (`#exportSalesCsv`)
- **Implementation reference**: `admin/js/sales.js`

---

### 9.4 Inventory & SKU Management (`admin/products.html`)

#### PRODUCTS-INVENTORY-CATALOG — Catalog Management
- **Status**: `[EXISTING]`
- **KPI Summary Cards**:
  - `Total Catalog SKUs`
  - `Total Stocked Units`
  - `Total Inventory Valuation (Cost Basis)`
  - `Low / Out of Stock Alerts`
- **Product Modal Fields (`#productModal`)**:
  - `Product Name` (Required)
  - `SKU / Barcode` (Optional alphanumeric code)
  - `Category` (e.g. `Food`, `Medicine`, `Electronics`, `General`)
  - `Cost Price (Wholesale Buy)` (Used for exact gross profit computation)
  - `Selling Price (Retail MRP)` (Charged at POS)
  - `Current Stock Quantity`
  - `Minimum Safety Level` (Threshold triggering low-stock alerts)
  - `Perishable Batch Tracking Toggle` (Enables FEFO expiry tracking)
  - `Supplier Name`
- **Spreadsheet Bulk Importer**:
  - Title: `AI-Assisted Excel / CSV Importer`
  - Description: Upload any distributor product list. SalesIQ automatically maps non-standard column headers (e.g. *"Rate"* → Selling Price, *"Qty"* → Stock) using Google Gemini AI.
- **Implementation reference**: `admin/js/products.js`

---

### 9.5 Restock & Inward Purchases (`admin/purchases.html`)

#### RESTOCK-PURCHASES-FORM — Inward Shipment Logging
- **Status**: `[EXISTING]`
- **Inputs**:
  - `Select Product`: Dropdown populated from product catalog
  - `Restock Quantity`: Number of units received
  - `Supplier Name`: Vendor company (automatically updates or creates supplier directory profiles)
  - `Wholesale Purchase Price`: Cost per unit
  - `Purchase Date`: Defaults to local date string (`toLocalYMD`)
  - **Perishable Goods Section** (Conditional for Food & Medicine):
    - `Batch Number` (e.g. `BATCH-2026-X`)
    - `Manufacturing Date`
    - `Expiry Date` (Validated to ensure expiry is strictly after manufacture date)
- **Restock History Table**:
  - Shows Product, Inward Quantity, Supplier, Unit Price, Purchase Date, and Timestamp.
- **Implementation reference**: `admin/js/purchases.js`

---

### 9.6 Contacts & Directory (`admin/contacts.html`)

#### CONTACTS-DIRECTORY — Customer CRM & Supplier Register
- **Status**: `[EXISTING]`
- **Tabs**: `Customers` & `Suppliers`
- **Customer Directory Columns**:
  - `Customer Name` (Initial avatar + full name)
  - `Phone Number`
  - `Email Address`
  - `Total Lifetime Spent` (Cumulative sum aggregated across all sales)
  - `Last Purchase Date`
  - `Buyer Status Badge`: `VIP Buyer` (Spent ≥ ₹10,000) or `Regular`
  - `Actions`: `Edit`, `Delete`
- **Supplier Directory Columns**:
  - `Supplier Name` (Initial avatar + registered trade address)
  - `Contact Number`
  - `Email`
  - `Products Supplied`
  - `Last Order Date` (Synchronized automatically from restock purchases)
  - `Payment Terms Status`: `✓ Paid`, `⚡ Partial`, or `⚠️ Pending`
- **Implementation reference**: `admin/js/contacts.js`

---

### 9.7 Advanced Analytics & Gross Margins (`admin/analytics.html`)

#### ANALYTICS-MODULE — Financial Intelligence
- **Status**: `[EXISTING]`
- **Top Financial KPIs**:
  - `Total Period Revenue`
  - `Estimated Gross Profit` (Calculated as `Total Revenue − Cost Basis`)
  - `Blended Gross Margin Percentage` (e.g. `34.2%`)
  - `Average Order Value (AOV)`
  - `Total Units Sold`
- **Visual Analytics Charts**:
  - `Daily Sales Timeline` (Toggle between Revenue vs. Order Units)
  - `Monthly Revenue Aggregation`
  - `Top 10 Selling Products by Volume`
  - `Category Revenue Contribution Donut`
  - `Gross Profit Margin Trendline`
  - `Payment Tender Split (UPI, Card, Cash)`
  - `Day of Week Revenue Heatmap`
  - `Staff Billing Performance Bar Chart`
- **Dead Stock & Trapped Capital Auditor**:
  - Audits stocked items with zero sales velocity over the past 30 days.
  - Computes total locked capital in idle inventory with 1-click CSV export.
- **Implementation reference**: `admin/js/analytics.js`

---

### 9.8 Predictive Demand Forecasting Engine (`admin/forecasting.html`)

#### FORECASTING-ENGINE — Inventory Runway Predictor
- **Status**: `[EXISTING]`
- **Controls**:
  - `Select Product`: Choose item from catalog
  - `Forecast Time Horizon`: Slider choosing 7, 14, 30, or 60 days
- **Calculated Metric Outputs**:
  - `Weighted Average Daily Sales (ADS)`
  - `Projected Stock Depletion Date` (Exact calendar date of expected stockout)
  - `Estimated Days of Inventory Runway Remaining`
  - `Suggested Reorder Quantity` (Computed to cover lead times plus buffer safety stock)
  - `Expiry / Spoilage Warning Alert` (Flags batches that will expire before projected sales velocity can clear them)
- **AI Executive Commentary**:
  - Powered by Gemini AI; explains the demand trajectory, supplier lead-time recommendations, and margin defense strategies.
- **Implementation reference**: `admin/js/forecasting.js`

---

### 9.9 AI Insights Copilot (`admin/ai-insights.html`)

#### AI-COPILOT-MODULE — Executive Briefing & Strategy Consultant
- **Status**: `[EXISTING]`
- **Top Diagnostic Health Cards**:
  - `Total Catalog Products`
  - `Inventory Stockout Risk`
  - `Batches Expiring This Month`
  - `Trapped Dead Stock Capital`
- **Pre-Configured Strategic Question Prompts**:
  1. *"Which products should I restock first and what is the stockout risk?"*
  2. *"How can I improve gross profit margins without hurting sales volume?"*
  3. *"Which slow-moving products should be discounted or bundled?"*
  4. *"What are our peak sales hours and days?"*
  5. *"What is our customer retention rate and how can we boost repeat visits?"*
  6. *"Are any perishable batches nearing expiration this month?"*
- **Morning Executive Briefing Generator**:
  - Generates comprehensive markdown report summarizing:
    - 📊 Store Financial Pulse (Revenue, gross margins, AOV)
    - 📦 Inventory Diagnostic Health (Out-of-stock items, dead capital)
    - 🏆 Category & Velocity Leaders (Top selling SKU, highest revenue category)
    - 🎯 Key Action Items for Today
- **Implementation reference**: `admin/js/ai-insights.js`

---

### 9.10 Real-Time Notifications Hub (`admin/notifications.html`)

#### NOTIFICATIONS-FEED — Alert Categories & Actions
- **Status**: `[EXISTING]`
- **Filter Tabs**:
  - `All Notifications`
  - `Unread Alerts`
  - `Stock & Inventory Warnings`
  - `New Sales Recorded`
  - `Restock Purchases Completed`
- **Alert Card Formatting**:
  - Out of Stock: Red left accent (`⛔ Out of Stock`)
  - Low Stock Warning: Amber left accent (`⚠️ Low Stock Warning`)
  - Sale Recorded: Emerald left accent (`🧾 Sale Recorded`)
  - Restock Added: Sky blue left accent (`📦 Restock Completed`)
- **Global Actions**:
  - `Mark All as Read`
  - `Clear All Notifications`
- **Implementation reference**: `admin/js/notifications.js`

---

### 9.11 Business Settings & Tenant Configuration (`admin/settings.html`)

#### BUSINESS-SETTINGS-FORM — Store Identity & Preferences
- **Status**: `[EXISTING]`
- **Configuration Fields**:
  - `Business / Store Name` (e.g. `SalesIQ Retail Superstore`)
  - `Business Logo Image URL` (Live preview in invoice mockup)
  - `Base Currency Symbol` (Options: `₹ - Indian Rupee (INR)`, `$ - US Dollar (USD)`, `€ - Euro (EUR)`, `£ - British Pound (GBP)`, `AED - UAE Dirham`, `CA$ - Canadian Dollar`, `A$ - Australian Dollar`)
  - `Default Sales Tax Rate (%)` (e.g. `18` for 18% GST)
  - `Invoice Prefix Code` (Defaults to `SIQ`; auto-formatted to uppercase)
  - `Theme Preference` (`Dark Mode (Default)`, `Light Mode`)
- **Live Interactive Invoice Sample**:
  - Automatically renders a mock receipt demonstrating how the selected logo, prefix, tax rate, and currency appear to customers.
- **System Storage & Offline Diagnostics**:
  - Shows counts of cached Products, Sales, and Customers stored in IndexedDB.
  - `Clear Local Cache & Hard Reload` button for manual cache invalidation.
- **Implementation reference**: `admin/js/settings.js`

---

### 9.12 Team Administration & Access Control (`admin/users.html`)

#### USERS-MANAGEMENT — Staff Credentials & Pairing
- **Status**: `[EXISTING]`
- **Admin Roster Table**:
  - Lists Administrator names, emails, roles, creation dates, and last login timestamps.
  - Protected with self-deletion guards (`id !== profile.id`).
- **Staff Roster Table**:
  - Lists Sales Staff cashiers with their linked Admin inventory status:
    - `Connected to you` (Full POS billing rights to your store inventory)
    - `Invitation Pending`
    - `Connected to Other Admin`
    - `Not Connected`
- **New Staff Invitation Modal (`#userModal`)**:
  - Fields: `Staff Full Name`, `Staff Email`, `Initial Temporary Password`, `Role (Sales Staff)`.
- **Implementation reference**: `admin/js/users.js`

---

## 10. Sales Staff Field Portal

### 10.1 Staff Dashboard (`sales/dashboard.html`)

#### STAFF-DASHBOARD-VIEW — Cashier Overview
- **Status**: `[EXISTING]`
- **Connection Badge**:
  - Displays linked store status: `Connected: [Admin Name]` (Emerald) or `Not Connected` (Slate).
- **Staff Daily Performance Cards**:
  - `Today Sales`: Total revenue billed by this cashier today.
  - `Orders Created`: Personal order count across shift.
  - `Assigned Products`: Catalog SKU count available to sell.
  - `Total Performance`: All-time revenue billed by this staff member.
- **Quick Shortcuts**:
  - `Open Billing Terminal` → links to `sales/add-sale.html`
  - `View Live Stock` → links to `sales/stock-view.html`
  - `My Sales Records` → links to `sales/my-sales.html`
- **Implementation reference**: `sales/js/dashboard.js`

---

### 10.2 Staff High-Speed Counter POS (`sales/add-sale.html`)

#### STAFF-POS-TERMINAL — Counter Checkout
- **Status**: `[EXISTING]`
- **Features**:
  - Auto-selects connected admin inventory ceiling.
  - Validates batch availability using FEFO rules.
  - Updates customer directory lifetime spend without creating duplicate profiles.
  - Prints clean thermal receipts with store logo and invoice number.
  - Isolated from wholesale cost prices and gross margin reports.
- **Implementation reference**: `sales/js/add-sale.js`

---

### 10.3 Personal Sales History & Performance (`sales/my-sales.html`)

#### STAFF-MY-SALES — Cashier Shift Ledger
- **Status**: `[EXISTING]`
- **Metrics Summary**:
  - `Today Orders`
  - `Weekly Orders`
  - `Monthly Orders`
  - `Total Revenue Billed`
- **Filter Controls**:
  - Calendar date selector (Aligned with local browser timezone)
  - Period dropdown (`All Time`, `Today`, `This Week`, `This Month`)
- **Shift Order Table**:
  - Shows Invoice No, Product, Quantity, Total Amount, Payment Tender, and Date.
- **Implementation reference**: `sales/js/my-sales.js`

---

### 10.4 Real-Time Catalog & Stock Checker (`sales/stock-view.html`)

#### STAFF-STOCK-VIEW — Live Floor Catalog
- **Status**: `[EXISTING]`
- **Purpose**: Gives floor staff instant mobile-friendly access to check inventory levels for customers.
- **Search & Filter Controls**:
  - Live search input matching product names, categories, or SKUs in real time.
  - Category dropdown filter.
  - Stock availability status filter (`All`, `Available`, `Low Stock`, `Out of Stock`).
- **Table Columns**:
  - `Product Name & SKU`
  - `Category Badge`
  - `Retail Selling Price`
  - `Available Stock Count` (Color-coded: Emerald for healthy, Amber for low, Crimson for out)
  - `Action`: 1-Click `💳 Sell` button pre-filling the POS billing terminal.
- **Implementation reference**: `sales/js/stock-view.js`

---

## 11. Technical, Routing & Architecture Reference

### 11.1 Complete Route Catalog

| Public Route URL | Source File Path | Description | Access Tier |
|---|---|---|---|
| `/` or `/index.html` | `src/App.tsx` + `index.html` | Public landing page with React UI showcase | Public / Anonymous |
| `/login` or `/login.html` | `login.html` + `js/auth.js` | User authentication & Google sign-in | Public / Anonymous |
| `/register` or `/register.html` | `register.html` + `js/auth.js` | User registration & role assignment | Public / Anonymous |
| `/profile` or `/profile.html` | `profile.html` + `js/profile.js` | User settings, theme toggle & tenant copy | Authenticated (Any) |
| `/poster` or `/poster.html` | `poster.html` | High-impact promotional marketing view | Public / Anonymous |
| `/404` or `/404.html` | `404.html` | Fallback route for missing pages | Public / Anonymous |
| `/admin/dashboard` | `admin/dashboard.html` | Executive real-time business cockpit | Admin Only |
| `/admin/add-sale` | `admin/add-sale.html` | Point of Sale (POS) billing terminal | Admin Only |
| `/admin/sales` | `admin/sales.html` | Sales ledger with stock restore deletion | Admin Only |
| `/admin/products` | `admin/products.html` | Inventory SKU management & AI Excel importer | Admin Only |
| `/admin/purchases` | `admin/purchases.html` | Restock procurement & supplier syncing | Admin Only |
| `/admin/contacts` | `admin/contacts.html` | Customer CRM & Supplier directory | Admin Only |
| `/admin/analytics` | `admin/analytics.html` | Financial analytics & gross margin audit | Admin Only |
| `/admin/forecasting` | `admin/forecasting.html` | Demand velocity forecasting & stockout dates | Admin Only |
| `/admin/ai-insights` | `admin/ai-insights.html` | Gemini AI copilot & morning briefings | Admin Only |
| `/admin/notifications` | `admin/notifications.html` | Operational alert hub & stock warnings | Admin Only |
| `/admin/settings` | `admin/settings.html` | Business branding, currency & cache purge | Admin Only |
| `/admin/users` | `admin/users.html` | Team access administration & staff pairing | Admin Only |
| `/sales/dashboard` | `sales/dashboard.html` | Cashier shift overview & performance stats | Sales Staff Only |
| `/sales/add-sale` | `sales/add-sale.html` | Frontline checkout terminal | Sales Staff Only |
| `/sales/my-sales` | `sales/my-sales.html` | Personal order transaction log | Sales Staff Only |
| `/sales/stock-view` | `sales/stock-view.html` | Read-only live catalog with 1-click Sell | Sales Staff Only |

---

### 11.2 Cloud Firestore Collections Schema

1. **`admins`**: Stores business owner profiles (`uid`, `name`, `email`, `role: "Admin"`, `status: "active"`, `createdAt`, `lastLoginAt`).
2. **`staff`**: Stores sales cashier profiles (`uid`, `name`, `email`, `role: "Sales Staff"`, `adminId`, `adminName`, `status: "active"`).
3. **`products`**: Inventory catalog items (`name`, `sku`, `category`, `costPrice`, `price`, `stock`, `minStock`, `status`, `adminId`, `supplierName`).
4. **`productBatches`**: Perishable stock batches (`productId`, `productName`, `batchNo`, `manufactureDate`, `expiryDate`, `quantity`, `remainingQuantity`, `adminId`).
5. **`sales`**: Order transaction documents (`invoiceNumber`, `productId`, `productName`, `quantity`, `price`, `costPrice`, `totalAmount`, `profit`, `customerName`, `paymentMethod`, `salespersonId`, `salespersonName`, `source`, `adminId`, `soldBatches`, `createdAt`).
6. **`purchases`**: Inward restock shipment records (`productId`, `productName`, `quantity`, `purchasePrice`, `supplierName`, `purchaseDate`, `adminId`).
7. **`customers`**: Buyer profiles (`name`, `phone`, `email`, `totalSpent`, `lastPurchaseDate`, `lastOrderAmount`, `adminId`).
8. **`suppliers`**: Vendor registry (`name`, `contactNumber`, `email`, `address`, `productsSupplied`, `lastOrderDate`, `paymentStatus`, `adminId`).
9. **`notifications`**: System alert feed (`message`, `type: "stock"|"sale"|"purchase"`, `read: boolean`, `adminId`, `createdAt`).
10. **`businessSettings`**: Store parameters (`businessName`, `logoUrl`, `currency`, `taxPercent`, `invoicePrefix`, `theme`, `adminId`).

---

### 11.3 Multi-Currency Exchange Rate Engine

Base Currency: **INR (₹)**. All inventory costs and sales totals are persisted in base currency and converted in client viewports.

| Currency Code | Symbol | Locale | Default Conversion Rate vs INR |
|---|---|---|---|
| `INR` | ₹ | `en-IN` | 1.0000 |
| `USD` | $ | `en-US` | 0.01032 |
| `EUR` | € | `en-IE` | 0.00922 |
| `GBP` | £ | `en-GB` | 0.00781 |
| `AED` | AED | `en-AE` | 0.03790 |
| `CAD` | CA$ | `en-CA` | 0.01470 |
| `AUD` | A$ | `en-AU` | 0.01480 |

---

### 11.4 Google Gemini AI Multi-Model Orchestration Pipeline

The AI Insights Copilot and Demand Forecasting engine utilize a multi-model failover pipeline implemented in `js/gemini-service.js`.

- **Primary Tier**: `gemini-2.5-flash` (Optimized for ultra-fast latency and high token bandwidth)
- **Secondary Tier**: `gemini-1.5-flash` (Standard enterprise operational model)
- **High-Reasoning Tier**: `gemini-1.5-pro` (Utilized for complex margin strategies)
- **Safety Fallback**: `gemini-pro` (Legacy stability baseline)
- **Deterministic Heuristic Engine**: Client-side mathematical analysis triggers automatically if network connectivity is lost or all API quotas are exhausted.

---

## 12. Content Conflict & Inconsistency Register

| Conflict ID | Issue / Inconsistency | Files Involved | Resolution Rule |
|---|---|---|---|
| CONF-01 | Super Admin email is hardcoded as `boss@gmail.com` in security rules while documentation references `admin@salesiq.app`. | `firestore-rules.txt`, `js/account.js`, `admin/js/settings.js` | Maintain `boss@gmail.com` as emergency bypass; allow tenant admins to manage their respective stores independently. |
| CONF-02 | Some legacy demo products use category "Accessories" while POS perishable logic checks "Food" and "Medicine". | `admin/js/demoSeeder.js`, `admin/js/add-sale.js` | Categories are normalized case-insensitively; only "Food" and "Medicine" trigger FEFO batch expiry workflows. |
| CONF-03 | Inward purchases previously used UTC date formatting while sales charts plotted local dates. | `admin/js/purchases.js`, `admin/js/dashboard.js` | Resolved: All controllers now uniformly utilize `toLocalYMD(new Date())` from `js/shared.js`. |
| CONF-04 | Admin sales deletion previously left inventory un-restored while add-sale decremented it. | `admin/js/sales.js`, `admin/js/add-sale.js` | Resolved: `deleteSale` now executes transactional stock re-increment and FEFO batch restoration. |

---

*End of SalesIQ Master Platform & Website Content Specification.*
