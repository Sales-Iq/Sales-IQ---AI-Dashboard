# ASTRAVA — Master Website Content

> **Pass 1 of 3 — Extraction & Editable Content Specification.** This document is the single source of truth for all website content in the ASTRAVA codebase. It was extracted directly from the repository without modifying any website file, source code, design, styling, routing, or existing content.
>
> Extraction date: 14 November 2026. Repository working directory: `D:\Temp\ag v0.3 testing`.

---

## 1. Missing Details & Content Gaps Requiring Input

The following gaps were found during the extraction audit. Each item also has a dedicated entry inside its relevant section below.

| ID | Gap / issue | Status | Where it appears | Input required |
|---|---|---|---|---|
| GAP-01 | No public studio phone number anywhere on the site. The only phone-shaped string is the form input hint `+91 00000 00000`. | `[MISSING]` | Contact page, header, footer | Real E.164 phone number and whether it should be displayed publicly |
| GAP-02 | No WhatsApp business number, click-to-chat link, or WhatsApp handle, even though the inquiry form asks for WhatsApp consent. | `[MISSING]` | Contact form, Privacy Notice | Real WhatsApp number/link, or remove WhatsApp consent references |
| GAP-03 | No social media profiles or handles (Instagram, LinkedIn, X, etc.) in the header, footer, contact page, or structured data. | `[MISSING]` | Global shell, Contact page | Real profile URLs and preferred display labels |
| GAP-04 | No real raster screenshots of projects. Work cards, case-study pages, and the project drawer all use abstract SVG glyphs drawn in code. | `[MISSING]` | Work index, Work detail, Project drawer | Real screenshots or approved product imagery, plus alt text |
| GAP-05 | No client testimonials, quotes, logos, ratings, or other third-party proof. The site’s philosophy explicitly rejects decorative testimonials. | `[MISSING]` | Home, Work, About | Verified client testimonials/logos if the policy changes; otherwise document the intentional omission |
| GAP-06 | No client project case studies. All five published projects are classified `Independent Project`; the `Client Project`, `Academic Project`, and `Concept` classifications exist in the type but are unused. | `[MISSING]` | Work index, Work detail | Real client case studies with permission, or confirmation that the index should remain independent-only |
| GAP-07 | No founder photographs. The About page uses initial-based monograms. | `[MISSING]` | About page → The founders | Real founder photos, crop guidance, and alt text |
| GAP-08 | No long-form founder bios, credentials, education, prior experience, or personal links. Only role, focus line, and skills are present. | `[MISSING]` | About page → The founders | Approved bios and credential details |
| GAP-09 | No legal entity name, registered address, company registration number (CIN/LLPIN), GSTIN, or formal jurisdiction details in the legal pages. | `[MISSING]` | Privacy Notice, Terms of Use | Verified legal entity details and counsel approval |
| GAP-10 | No refund, cancellation, project-pause, or termination policy. Payments and revisions are discussed, but cancellation terms are absent. | `[MISSING]` | Terms of Use, FAQ | Approved cancellation/refund policy |
| GAP-11 | No named grievance officer, data protection contact, or statutory escalation contact in the Privacy Notice. | `[MISSING]` | Privacy Notice | Name, role, email, and postal address if required by applicable law |
| GAP-12 | No full postal studio address or postcode. Only the city pair “Ahmedabad & Surat” is published. | `[MISSING]` | Contact page, About page, footer, structured data | Full address, or confirmation that the studio is remote-only and must not publish one |
| GAP-13 | No business hours, time zone, response-time commitment, or support availability window. The Contact page only says “Response: By email”. | `[MISSING]` | Contact page, footer, FAQ | Working hours, time zone, and response expectation |
| GAP-14 | Conflicting studio locations: the header and home page say “Vadodara & Surat”, while the About page, Contact page, footer, and structured data say “Ahmedabad & Surat”. | `[CONFLICT]` | Multiple pages and structured data | Confirm the correct city pair and approved wording |
| GAP-15 | Two home-page metric claims are unverified: “Deterministic Systems — 100%” and “Target Latency & Zero Slop — < 100ms”. No methodology, measurement context, or evidence is published. | `[NEEDS CONFIRMATION]` | Home page → Studio metrics strip | Keep, qualify, or replace with measured claims |
| GAP-16 | Work project links point to the personal GitHub account `RudraMistry-cmd`, not an official studio GitHub organisation. | `[MISSING]` | Work data → project links | Official studio GitHub URL, or confirmation that personal links are intentional |
| GAP-17 | The studio email `hello@astrava.studio` is used everywhere but deliverability is not verifiable from the repository. | `[NEEDS CONFIRMATION]` | Global config, header, footer, contact, legal pages, structured data | Confirm the mailbox is live and monitored |
| GAP-18 | Founder names are written surname-first (“Mistry Rudra”, “Patel Karan”, “Darji Harsh”). It is unclear whether this is the preferred public order. | `[NEEDS CONFIRMATION]` | About page, Global config, structured data | Confirm preferred display names and order |
| GAP-19 | Privacy Notice and Terms of Use have not been reviewed by counsel and contain open-ended retention, jurisdiction, and liability language. | `[LEGAL REVIEW REQUIRED]` | Privacy Notice, Terms of Use | Legal review and approval before relying on the text |
| GAP-20 | The site is missing a visible analytics/consent posture beyond the statement that no analytics scripts are used. If analytics, advertising, or third-party embeds are added, the Privacy Notice and consent flow must change first. | `[NEEDS CONFIRMATION]` | Privacy Notice → Cookies and analytics | Decide whether analytics will be introduced and document the resulting legal/consent requirements |

---

## 2. How to Use This Document

### 2.1 Status legend

| Status | Meaning |
|---|---|
| `[EXISTING]` | Real content currently rendered on the website. Replace it in the “New content” block if a change is required. |
| `[PLACEHOLDER]` | Content that exists only as a stand-in or input hint and must not be treated as a real business fact. |
| `[MISSING]` | A standard studio/business detail that is absent from the codebase and must be supplied. |
| `[NEEDS CONFIRMATION]` | Content exists but requires verification, approval, or supporting evidence. |
| `[CONFLICT]` | The same fact is stated inconsistently in different places. Resolve globally before editing individual instances. |
| `[LEGAL REVIEW REQUIRED]` | Content has legal or contractual implications and requires qualified review. |
| `[TECHNICAL VALUE — DO NOT EDIT AS COPY]` | A route, URL, schema value, enum, config key, or integration detail. Editing it can break the site, forms, or SEO. |

### 2.2 Field template

Every field uses this structure:

- **Status**: the current content state.
- **Purpose**: what the field controls.
- **Location**: page → section → component.
- **Current content**: exact existing text, or “Not currently implemented”.
- **New content**: the replacement block to fill in.
- **Implementation reference**: source file and variable/component.
- **Notes**: constraints, character limits, formatting rules, or dependencies.

### 2.3 Editing rules

1. Do not invent clients, testimonials, metrics, addresses, registration numbers, or credentials. Use the `[MISSING]` entries to request facts.
2. Resolve `[CONFLICT]` fields globally. A location change must be applied to every occurrence listed in the conflict register.
3. Where a field is fed by a typed data file, edit the data file rather than the page component. The page renders the data automatically.
4. Fields marked `[TECHNICAL VALUE — DO NOT EDIT AS COPY]` must be changed only by someone who understands routing, deployment, schema, or form validation.
5. Preserve exact punctuation, capitalisation, em dashes, ampersands, currency symbols, and line breaks unless a deliberate copy change is approved.
6. The inquiry form’s `projectTypes` and `budgetRanges` are duplicated in the client schema and the Express server schema. Any change must be made in both places or submissions will fail validation.

---

## 3. Contents

- [1. Missing Details & Content Gaps](#1-missing-details--content-gaps-requiring-input)
- [2. How to Use This Document](#2-how-to-use-this-document)
- [4. Global Brand & Site Configuration](#4-global-brand--site-configuration)
- [5. SEO, Metadata & Publishing Defaults](#5-seo-metadata--publishing-defaults)
- [6. Shared Shell: Header, Footer, CTA Band & Tech Sandbox](#6-shared-shell-header-footer-cta-band--tech-sandbox)
- [7. Home Page](#7-home-page)
- [8. Work Index Page](#8-work-index-page)
- [9. Work Detail Pages & Project Drawer](#9-work-detail-pages--project-drawer)
- [10. Case Study Content: Five Projects](#10-case-study-content-five-projects)
- [11. Services Page & Service Catalog](#11-services-page--service-catalog)
- [12. About Page & Founder Profiles](#12-about-page--founder-profiles)
- [13. How We Work Page & Process Steps](#13-how-we-work-page--process-steps)
- [14. FAQ Page](#14-faq-page)
- [15. Contact Page & Inquiry Form](#15-contact-page--inquiry-form)
- [16. Privacy Notice](#16-privacy-notice)
- [17. Terms of Use](#17-terms-of-use)
- [18. 404 Page](#18-404-page)
- [19. Technical, Routing & Integration Reference](#19-technical-routing--integration-reference)
- [20. Conflict Register](#20-conflict-register)

---

## 4. Global Brand & Site Configuration

### GLOBAL-NAME — Studio Name

- **Status**: `[EXISTING]`
- **Purpose**: The studio’s public wordmark and the value used in the header, footer, metadata, and structured data.
- **Location**: Global → Header / Footer / Metadata → `site.name`
- **Current content**:
  > ASTRAVA
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.name`); `index.html` (`<title>`, `og:site_name`, JSON-LD)
- **Notes**: Rendered in uppercase in the wordmark and footer. Used in the dynamic page-title template. Changing the name affects SEO metadata, legal pages, and structured data.

### GLOBAL-TAGLINE — Studio Tagline

- **Status**: `[EXISTING]`
- **Purpose**: The short brand line used as the header tooltip, default page title, and Open Graph image alt text.
- **Location**: Global → Header / SEO defaults
- **Current content**:
  > Digital Experiences, Thoughtfully Built.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.tagline`); `src/lib/seo.ts` (default title and image alt); `src/components/astrava/site-header.tsx` (tooltip)
- **Notes**: Keep the comma and final full stop if the line remains unchanged. The home-page `<h1>` splits this line across two visual lines and colours “Built.” in the accent colour.

### GLOBAL-DESCRIPTION — Studio Description

- **Status**: `[EXISTING]`
- **Purpose**: The canonical one-sentence studio description used in metadata, the home-page SEO description, and structured data.
- **Location**: Global → SEO defaults / Structured data
- **Current content**:
  > ASTRAVA is an independent digital studio designing and engineering thoughtful websites, digital products, and practical business software.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.description`); `index.html` (meta description, JSON-LD); `src/pages/HomePage.tsx` (page meta)
- **Notes**: The footer uses a slightly different variant: “Independent digital studio designing and engineering thoughtful websites, digital products, and practical business software.” Keep both variants deliberate or unify them.

### GLOBAL-EMAIL — Studio Email Address

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: The public contact email used by the header, footer, contact page, CTA band, legal pages, and structured data.
- **Location**: Global → Header / Footer / Contact / Legal / Structured data
- **Current content**:
  > hello@astrava.studio
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.email`, sourced from `VITE_STUDIO_EMAIL`, defaulting to `hello@astrava.studio`); `.env.example` (`VITE_STUDIO_EMAIL`)
- **Notes**: Confirm the mailbox is live and monitored before launch. If the address changes, update the environment variable or the default in `site.ts`; do not hard-code a different email in individual components.

### GLOBAL-URL — Canonical Site URL

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: The deployment origin used for canonical URLs, Open Graph URLs, structured data, sitemap, and robots.
- **Location**: Global → SEO / Deployment
- **Current content**:
  > https://astrava.studio
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.url`, sourced from `VITE_SITE_URL`); `.env.example` (`VITE_SITE_URL`); `index.html`; `public/sitemap.xml`; `public/robots.txt`
- **Notes**: No trailing slash in config. Changing the domain requires updating the environment variable, `index.html`, `public/sitemap.xml`, and `public/robots.txt`.

### GLOBAL-HERO-LOCATION — Header/Hero Location String

- **Status**: `[CONFLICT]`
- **Purpose**: The short location line shown beside the availability status in the header and mobile menu.
- **Location**: Global → Header / Mobile menu
- **Current content**:
  > Vadodara & Surat
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.heroLocation`); `src/components/astrava/site-header.tsx`
- **Notes**: Conflicts with `site.studioLocation` (“Ahmedabad & Surat”) used elsewhere. See `GLOBAL-CONFLICT-LOCATION` and the conflict register. Confirm the correct city pair before editing.

### GLOBAL-STUDIO-LOCATION — Studio Base Location String

- **Status**: `[CONFLICT]`
- **Purpose**: The studio base shown on the About page, Contact page, footer, mobile menu, and Privacy Notice.
- **Location**: Global → About / Contact / Footer / Privacy
- **Current content**:
  > Ahmedabad & Surat
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.studioLocation`)
- **Notes**: Conflicts with `site.heroLocation` (“Vadodara & Surat”). The Contact page separately renders tags “Ahmedabad”, “Surat”, and “Remote-first”, and the home page displays “Founding Builders (Vadodara & Surat)”. Confirm the official base wording and apply it consistently.

### GLOBAL-AVAILABILITY — Availability Status

- **Status**: `[EXISTING]`
- **Purpose**: The availability label shown with a green status dot in the header, mobile menu, and footer.
- **Location**: Global → Header / Footer
- **Current content**:
  > Available for Projects
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.availability`); `src/components/astrava/site-header.tsx`; `src/components/astrava/site-footer.tsx`
- **Notes**: The home-page studio-signal card uses the alternative label “Open for work”. Keep both expressions aligned if availability changes.

### GLOBAL-FOUNDERS — Founder Roster

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: The founder names used in structured data and the About page.
- **Location**: Global → Structured data / About page
- **Current content**:
  > Mistry Rudra
  > Patel Karan
  > Darji Harsh
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`site.founders`); `src/data/founders.ts`; `src/pages/AboutPage.tsx`; `index.html` (JSON-LD); `src/pages/HomePage.tsx` (JSON-LD)
- **Notes**: Names are rendered surname-first. Confirm preferred public order, spelling, and whether any founder should be omitted or added. See `GLOBAL-NEEDS-CONFIRMATION-FOUNDER-NAMES`.

### GLOBAL-NEEDS-CONFIRMATION-FOUNDER-NAMES — Founder Name Display Order

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: Governs how founder names are presented on the website and in structured data.
- **Location**: Global → About / Structured data
- **Current content**:
  > Mistry Rudra, Patel Karan, Darji Harsh
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/founders.ts` (`founders[].name`); `src/lib/site.ts` (`site.founders`)
- **Notes**: If switching to given-name-first, update both the data file and the `site.founders` array, plus the static JSON-LD in `index.html`.

### GLOBAL-NAV — Primary Navigation Labels

- **Status**: `[EXISTING]`
- **Purpose**: The five primary navigation labels in the desktop header and mobile sheet.
- **Location**: Global → Header
- **Current content**:
  > Work → /work
  > Services → /services
  > About → /about
  > How We Work → /how-we-work
  > FAQ → /faq
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`navItems`); `src/components/astrava/site-header.tsx`
- **Notes**: Labels are rendered in uppercase via CSS. Routes are technical values; changing a route requires updating `App.tsx`, links, and the sitemap.

### GLOBAL-FOOTER-LINKS — Footer Navigation Labels

- **Status**: `[EXISTING]`
- **Purpose**: The sitemap links in the footer.
- **Location**: Global → Footer → Sitemap column
- **Current content**:
  > Work → /work
  > Services → /services
  > About → /about
  > How We Work → /how-we-work
  > FAQ → /faq
  > Contact → /contact
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`footerLinks`); `src/components/astrava/site-footer.tsx`
- **Notes**: The footer includes Contact, unlike the primary navigation. Keep the order unless a navigation redesign is approved.

### GLOBAL-MISSING-PHONE — Public Studio Phone Number

- **Status**: `[MISSING]`
- **Purpose**: A direct voice contact for the studio.
- **Location**: Global → Contact page / Header / Footer
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No current implementation. The only phone-like string is the input hint in `src/components/astrava/inquiry-form.tsx` (`+91 00000 00000`).
- **Notes**: Do not treat the form hint as a real number. Supply a verified number with country code and decide whether it is displayed publicly, click-to-call, or kept private.

### GLOBAL-MISSING-WHATSAPP — WhatsApp Business Contact

- **Status**: `[MISSING]`
- **Purpose**: A real WhatsApp destination for the consent option offered in the inquiry form.
- **Location**: Global → Contact page / Privacy Notice
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: Consent checkbox in `src/components/astrava/inquiry-form.tsx`; references in `src/pages/PrivacyPage.tsx`. No number or click-to-chat link exists.
- **Notes**: Supply the business number and `https://wa.me/...` link if WhatsApp follow-up is a real channel. Otherwise remove or reword the consent references.

### GLOBAL-MISSING-SOCIAL — Social Media Profiles

- **Status**: `[MISSING]`
- **Purpose**: Official social profiles for credibility, hiring, and project inquiries.
- **Location**: Global → Header / Footer / Contact page
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No social links exist. The only external profile links are personal GitHub URLs in `src/data/work.ts`.
- **Notes**: Supply verified URLs and preferred labels. Do not invent handles. If the studio intentionally avoids social media, document that decision instead.

### GLOBAL-MISSING-POSTAL-ADDRESS — Full Postal Address

- **Status**: `[MISSING]`
- **Purpose**: A complete address for legal, trust, and structured-data purposes.
- **Location**: Global → Contact page / Legal pages / Structured data
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `site.studioLocation` is the only location value; no street address, postcode, or country line beyond `IN` in structured data.
- **Notes**: If the studio is remote-first with no public office, confirm that no postal address should be published and adjust legal/schema text accordingly.

### GLOBAL-MISSING-HOURS — Business Hours, Time Zone & Response Window

- **Status**: `[MISSING]`
- **Purpose**: Sets expectations for when inquiries are read and support is available.
- **Location**: Global → Contact page / FAQ / Footer
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: Contact page meta only says “Response: By email”. No hours or time zone exist.
- **Notes**: Supply working hours (IST assumed but not stated), response-time target, and any holiday/availability policy. Avoid promising an SLA the studio cannot keep.

### GLOBAL-MISSING-STUDIO-GITHUB — Official Studio GitHub Organisation

- **Status**: `[MISSING]`
- **Purpose**: A studio-owned destination for open-source work and project repositories.
- **Location**: Global → Work project links
- **Current content**:
  > Not currently implemented. Project links point to `https://github.com/RudraMistry-cmd` and repositories under that personal account.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`links[].href`)
- **Notes**: Confirm whether a studio organisation exists. If not, decide whether personal links are acceptable or should be replaced with neutral project pages.

### GLOBAL-MISSING-CLIENT-TESTIMONIALS — Client Testimonials & Third-Party Proof

- **Status**: `[MISSING]`
- **Purpose**: Third-party credibility through quotes, logos, ratings, or references.
- **Location**: Global → Home / Work / About
- **Current content**:
  > Not currently implemented. The home-page philosophy says: “No invented clients, fake metrics, or decorative testimonials. If it is on this site, it is real enough to explain.”
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No testimonial data or component exists. `src/pages/HomePage.tsx` (`philosophy[2]`).
- **Notes**: Only add testimonials that are real, attributable, and permission-cleared. If the studio keeps the anti-testimonial position, add a deliberate statement explaining the alternative proof model.

### GLOBAL-NEEDS-CONFIRMATION-METRICS — Unverified Performance & Quality Claims

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: The home-page metrics strip, which makes quantified claims about the studio.
- **Location**: Home page → Studio metrics strip
- **Current content**:
  > Deterministic Systems — 100%
  > Target Latency & Zero Slop — < 100ms
  > Founding Builders (Vadodara & Surat) — 3
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (metrics section)
- **Notes**: “100%” and “< 100ms” have no published methodology or measurement context. Confirm what they refer to, qualify them, or replace them with verifiable facts. The third metric is factual but contains the location conflict.

### GLOBAL-CONFLICT-LOCATION — Conflicting Studio Locations

- **Status**: `[CONFLICT]`
- **Purpose**: Canonical resolution field for the two city pairs used across the site.
- **Location**: Global → Header / Home / About / Contact / Footer / Privacy / Structured data
- **Current content**:
  > “Vadodara & Surat” — `site.heroLocation`; desktop header status; mobile menu status; home studio-signal card; home metric label “Founding Builders (Vadodara & Surat)”.
  >
  > “Ahmedabad & Surat” — `site.studioLocation`; mobile menu “Remote-first” panel; About SEO description; About intro meta; About body copy; About remote-first section; Contact intro meta; Contact footprint card; footer status; Privacy Notice; Home JSON-LD; `index.html` JSON-LD.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/site.ts` (`heroLocation`, `studioLocation`); all occurrences listed in the conflict register.
- **Notes**: This is a factual conflict, not a stylistic variation. Confirm whether the studio is based in Vadodara, Ahmedabad, both, or neither. Then centralise the approved wording in `site.ts` and remove hard-coded duplicates.

---

## 5. SEO, Metadata & Publishing Defaults

### SEO-DEFAULT-TITLE — Default Page Title

- **Status**: `[EXISTING]`
- **Purpose**: The title used for the home page and any page without a specific title.
- **Location**: Global → Document head
- **Current content**:
  > ASTRAVA — Digital Experiences, Thoughtfully Built.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (`<title>`); `src/lib/seo.ts` (`usePageMeta`)
- **Notes**: The dynamic template is `{Page title} — ASTRAVA` when a title is supplied. Keep the em dash and spacing consistent.

### SEO-TITLE-TEMPLATE — Page Title Pattern

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Controls how individual page titles are composed.
- **Location**: Global → Head metadata
- **Current content**:
  > `{title} — ASTRAVA` when `title` is provided; otherwise `ASTRAVA — Digital Experiences, Thoughtfully Built.`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/seo.ts` (`usePageMeta`)
- **Notes**: Changing the separator or order affects every route’s browser title and social title.

### SEO-DEFAULT-DESCRIPTION — Default Meta Description

- **Status**: `[EXISTING]`
- **Purpose**: The default description used on the home page and as the static HTML description.
- **Location**: Global → Document head
- **Current content**:
  > ASTRAVA is an independent digital studio designing and engineering thoughtful websites, digital products, and practical business software.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (meta description); `src/lib/site.ts` (`site.description`)
- **Notes**: The Open Graph description is a different sentence; see `SEO-OG-DESCRIPTION`.

### SEO-OG-TITLE — Open Graph Title

- **Status**: `[EXISTING]`
- **Purpose**: The title shown when the site is shared on social platforms.
- **Location**: Global → Document head
- **Current content**:
  > ASTRAVA — Digital Experiences, Thoughtfully Built.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (`og:title`, `twitter:title`); `src/lib/seo.ts` (dynamic pages)
- **Notes**: Dynamic pages replace this with the page title plus the `— ASTRAVA` suffix.

### SEO-OG-DESCRIPTION — Open Graph Description

- **Status**: `[EXISTING]`
- **Purpose**: The description shown when the home page is shared.
- **Location**: Global → Document head
- **Current content**:
  > An independent digital studio focused on thoughtful websites, digital products, and practical business software.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (`og:description`, `twitter:description`)
- **Notes**: This is shorter than the standard meta description. Keep the distinction intentional or unify the wording.

### SEO-OG-IMAGE — Social Sharing Image

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: The raster image used in Open Graph and Twitter cards.
- **Location**: Global → Document head / Public assets
- **Current content**:
  > `/og-image.png` — 1200 × 630, referenced as `https://astrava.studio/og-image.png`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `public/og-image.png`; `index.html`; `src/lib/seo.ts`
- **Notes**: Preserve the 1200 × 630 dimensions unless the social-card strategy changes. If the image is replaced, update the alt text only if the visual message changes.

### SEO-OG-IMAGE-ALT — Social Sharing Image Alt Text

- **Status**: `[EXISTING]`
- **Purpose**: Accessible description of the social card image.
- **Location**: Global → Document head
- **Current content**:
  > ASTRAVA — Digital Experiences, Thoughtfully Built.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (`og:image:alt`); `src/lib/seo.ts` (`setMeta("property", "og:image:alt", ...)`)
- **Notes**: Should describe the actual image. If the image changes, revise this text.

### SEO-TWITTER-METADATA — Twitter/X Card Defaults

- **Status**: `[EXISTING]`
- **Purpose**: Controls the Twitter/X card type, title, description, and image.
- **Location**: Global → Document head
- **Current content**:
  > Card: summary_large_image
  > Title: ASTRAVA — Digital Experiences, Thoughtfully Built.
  > Description: An independent digital studio focused on thoughtful websites, digital products, and practical business software.
  > Image: https://astrava.studio/og-image.png
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html`; `src/lib/seo.ts`
- **Notes**: The site does not declare a Twitter/X handle. Add one only if a verified studio account exists.

### SEO-OG-LOCALE — Open Graph Locale

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Declares the content locale to social platforms.
- **Location**: Global → Document head
- **Current content**:
  > en_IN
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (`og:locale`)
- **Notes**: Change only if the studio’s primary audience or language changes.

### SEO-NOSCRIPT — No-JavaScript Message

- **Status**: `[EXISTING]`
- **Purpose**: Fallback message for visitors with JavaScript disabled.
- **Location**: Global → `index.html` `<noscript>`
- **Current content**:
  > ASTRAVA needs JavaScript to render this site. You can reach the studio directly at hello@astrava.studio.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html` (`<noscript>`)
- **Notes**: The email is a hard-coded duplicate of `site.email`. Update it if the studio email changes.

### SEO-JSONLD-ORGANIZATION — Organisation Structured Data

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Describes the organisation to search engines and social platforms.
- **Location**: Global → `index.html` JSON-LD; Home page JSON-LD; About page JSON-LD
- **Current content**:
  > `@type`: Organization
  > `name`: ASTRAVA
  > `url`: https://astrava.studio/
  > `email`: hello@astrava.studio
  > `description`: An independent digital studio focused on designing and engineering thoughtful websites, digital products, and practical business software.
  > `founder`: Person — Mistry Rudra, Patel Karan, Darji Harsh
  > `address.addressLocality`: Ahmedabad & Surat
  > `address.addressCountry`: IN
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html`; `src/pages/HomePage.tsx`; `src/pages/AboutPage.tsx`
- **Notes**: `addressLocality` containing two cities joined by an ampersand is not a valid single locality. Resolve alongside `GLOBAL-CONFLICT-LOCATION`. Do not invent a street address.

### SEO-CANONICAL — Canonical URL

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Declares the preferred URL for each route.
- **Location**: Global → Document head
- **Current content**:
  > `https://astrava.studio/` for the home page; each route appends its path (for example, `https://astrava.studio/work`).
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html`; `src/lib/seo.ts` (`setCanonical`)
- **Notes**: Generated from `site.url` plus the route path. The 404 page uses `/404` as its canonical path even though it is not a real route.

---

## 6. Shared Shell: Header, Footer, CTA Band & Tech Sandbox

### SHELL-SKIP-LINK — Skip to Content Link

- **Status**: `[EXISTING]`
- **Purpose**: Keyboard-accessible skip link.
- **Location**: Global → App shell → Before header
- **Current content**:
  > Skip to content
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/App.tsx` (`ShellContent`)
- **Notes**: Visually hidden until focused.

### SHELL-LOADING — Route Loading Message

- **Status**: `[EXISTING]`
- **Purpose**: Fallback shown while a lazy-loaded page is loading.
- **Location**: Global → App shell → Suspense fallback
- **Current content**:
  > Loading studio
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/App.tsx` (`RouteFallback`)
- **Notes**: Rendered in uppercase monospace. Keep it short.

### HEADER-BRAND-ARIA — Header Brand Accessible Label

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Screen-reader label for the logo link.
- **Location**: Global → Header → Brand link
- **Current content**:
  > ASTRAVA home
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-header.tsx` (`aria-label={`${site.name} home`}`)
- **Notes**: Generated from `site.name`. Also used by the footer brand link.

### HEADER-STATUS — Header Availability & Location

- **Status**: `[CONFLICT]`
- **Purpose**: The live availability line beside the wordmark on large screens.
- **Location**: Global → Header → Brand cluster
- **Current content**:
  > Available for Projects • Vadodara & Surat
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-header.tsx`; `site.availability`; `site.heroLocation`
- **Notes**: Location conflicts with the rest of the site. The bullet is decorative. Hidden below the `xl` breakpoint; the mobile sheet shows the same line.

### HEADER-CTA — Header “Let’s Talk” Button

- **Status**: `[EXISTING]`
- **Purpose**: Primary header call to action.
- **Location**: Global → Header → Right cluster
- **Current content**:
  > Let’s Talk
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-header.tsx` (`ActionLink to="/contact"`)
- **Notes**: Hidden on the smallest screens; the mobile sheet repeats it. Uses a typographic apostrophe in rendered output.

### HEADER-MOBILE-SHEET — Mobile Navigation Sheet Copy

- **Status**: `[CONFLICT]`
- **Purpose**: All text inside the mobile navigation drawer.
- **Location**: Global → Header → Mobile menu sheet
- **Current content**:
  > Title: ASTRAVA
  > Status: Available for Projects • Vadodara & Surat
  > Navigation: 01 Work, 02 Services, 03 About, 04 How We Work, 05 FAQ
  > Section label: Start a conversation
  > Email: hello@astrava.studio
  > Section label: Remote-first
  > Location: Ahmedabad & Surat
  > Button: Let’s Talk
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-header.tsx` (Sheet content); `site.email`; `site.availability`; `site.heroLocation`; `site.studioLocation`
- **Notes**: The status line uses `heroLocation` while the lower location block uses `studioLocation`, so both city pairs appear in the same panel. Resolve the location conflict before editing.

### HEADER-MOBILE-ARIA — Mobile Menu Accessible Labels

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Screen-reader labels for the menu trigger and mobile navigation.
- **Location**: Global → Header → Mobile menu
- **Current content**:
  > Open navigation menu
  > Mobile navigation
  > Primary navigation
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-header.tsx`
- **Notes**: These labels are not visible copy but are part of the accessible experience.

### FOOTER-DESCRIPTION — Footer Studio Description

- **Status**: `[EXISTING]`
- **Purpose**: Short studio description beneath the footer wordmark.
- **Location**: Global → Footer → Brand column
- **Current content**:
  > Independent digital studio designing and engineering thoughtful websites, digital products, and practical business software.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-footer.tsx`
- **Notes**: This is shorter than `site.description` and omits the leading “ASTRAVA is an”. Keep the variation deliberate.

### FOOTER-STATUS — Footer Availability & Location Line

- **Status**: `[CONFLICT]`
- **Purpose**: Availability, work model, and base shown under the footer description.
- **Location**: Global → Footer → Brand column
- **Current content**:
  > Available for Projects / Remote-first / Ahmedabad & Surat
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-footer.tsx`; `site.availability`; `site.studioLocation`
- **Notes**: Uses “Ahmedabad & Surat”, conflicting with the header and home page. Separators are slash characters.

### FOOTER-SITEMAP-LABEL — Footer Sitemap Label

- **Status**: `[EXISTING]`
- **Purpose**: Heading above the footer navigation.
- **Location**: Global → Footer → Sitemap column
- **Current content**:
  > Sitemap
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-footer.tsx`
- **Notes**: Rendered in uppercase monospace.

### FOOTER-CONTACT — Footer Contact Column

- **Status**: `[EXISTING]`
- **Purpose**: Contact links and service-discipline line in the footer.
- **Location**: Global → Footer → Contact column
- **Current content**:
  > Contact
  > hello@astrava.studio
  > Project inquiry form
  > Strategy / Design
  > Engineering / Handover
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-footer.tsx`; `site.email`
- **Notes**: “Project inquiry form” links to `/contact`; the email opens the default mail client. No phone or WhatsApp link is present.

### FOOTER-LEGAL — Footer Legal & Utility Links

- **Status**: `[EXISTING]`
- **Purpose**: Copyright and legal/utility links at the bottom of the site.
- **Location**: Global → Footer → Bottom bar
- **Current content**:
  > © 2026 ASTRAVA. All rights reserved.
  > Privacy
  > Terms
  > Back to top
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/site-footer.tsx`
- **Notes**: The copyright year is hard-coded. Update it manually or make it dynamic. “Back to top” uses smooth scrolling.

### CTA-EYEBROW — CTA Band Eyebrow

- **Status**: `[EXISTING]`
- **Purpose**: Small label above the site-wide call to action.
- **Location**: Global → CTA band
- **Current content**:
  > Next project / 2026
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/cta-band.tsx`
- **Notes**: “Next project” is accented; “/ 2026” is muted. The year is hard-coded.

### CTA-TITLE — CTA Band Heading

- **Status**: `[EXISTING]`
- **Purpose**: Main call-to-action heading.
- **Location**: Global → CTA band
- **Current content**:
  > Have something worth building?
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/cta-band.tsx`
- **Notes**: Display serif face at large sizes. Keep the question format unless a different CTA strategy is approved.

### CTA-BODY — CTA Band Supporting Copy

- **Status**: `[EXISTING]`
- **Purpose**: Supporting paragraph beneath the CTA heading.
- **Location**: Global → CTA band
- **Current content**:
  > Tell us what is not working. We will help you find the right scope, the right sequence, and the honest version of what it takes.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/cta-band.tsx`
- **Notes**: Three-sentence rhythm. Avoid adding guarantees or fixed timelines.

### CTA-BUTTONS — CTA Band Button Labels

- **Status**: `[EXISTING]`
- **Purpose**: The two actions at the bottom of the CTA band.
- **Location**: Global → CTA band
- **Current content**:
  > Start a conversation → /contact
  > Email the studio → mailto:hello@astrava.studio
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/cta-band.tsx`
- **Notes**: The email action uses `site.email`. Keep both actions if the primary conversion paths remain the form and email.

### TECH-SANDBOX-LABELS — Tech Sandbox Labels

- **Status**: `[EXISTING]`
- **Purpose**: Headings around the interactive physics sandbox on the home page.
- **Location**: Home page → Tech sandbox
- **Current content**:
  > Tech sandbox / drag the stack
  > Architecture: Problem-First • Craft: Precision • Zero Slop
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/tech-sandbox.tsx`
- **Notes**: The middle dots are decorative. “Zero Slop” is a brand phrase; keep it consistent with other copy.

### TECH-SANDBOX-PILLS — Tech Sandbox Technology Pills

- **Status**: `[EXISTING]`
- **Purpose**: The draggable technology labels inside the sandbox canvas.
- **Location**: Home page → Tech sandbox
- **Current content**:
  > Python ⚡
  > FastAPI
  > React + TS
  > Docker
  > Terraform
  > Nginx
  > PostgreSQL
  > Tailwind v4
  > Deterministic AI
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/tech-sandbox.tsx` (`pills`)
- **Notes**: The lightning bolt is part of the rendered content. Pill width is calculated from label length, so very long labels may overflow the canvas; test on mobile after changing.

### TECH-SANDBOX-ARIA — Tech Sandbox Accessible Label

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Describes the canvas interaction to screen-reader users.
- **Location**: Home page → Tech sandbox
- **Current content**:
  > Interactive physics sandbox of studio technologies. Drag the pills to move them.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/tech-sandbox.tsx` (`aria-label`)
- **Notes**: The canvas is decorative but exposed as an image with this label. Update if the interaction model changes.

---

## 7. Home Page

### HOME-SEO — Home Page SEO Title & Description

- **Status**: `[EXISTING]`
- **Purpose**: Browser title and search/social description for `/`.
- **Location**: Home page → Metadata
- **Current content**:
  > Title: ASTRAVA — Digital Experiences, Thoughtfully Built.
  > Description: ASTRAVA is an independent digital studio designing and engineering thoughtful websites, digital products, and practical business software.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`usePageMeta`); `src/lib/site.ts` (`site.description`)
- **Notes**: Uses the default title because no page title is supplied.

### HOME-HERO-EYEBROW — Home Hero Eyebrow

- **Status**: `[EXISTING]`
- **Purpose**: Small bracketed positioning line above the hero heading.
- **Location**: Home page → Hero → Eyebrow
- **Current content**:
  > [ Independent digital studio — Gujarat, India ]
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (hero `<motion.p>`)
- **Notes**: Brackets are accented. The location is broader than the city strings and does not conflict. Keep it if the studio remains Gujarat-based.

### HOME-HERO-TITLE — Home Hero Heading

- **Status**: `[EXISTING]`
- **Purpose**: The primary brand headline on the home page.
- **Location**: Home page → Hero → H1
- **Current content**:
  > Digital Experiences,
  > Thoughtfully Built.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (hero `<motion.h1>`)
- **Notes**: The line break is forced. “Thoughtfully” is rendered at 90% white; “Built.” is accent orange. The text matches `site.tagline` except for the line break.

### HOME-HERO-BODY — Home Hero Supporting Paragraph

- **Status**: `[EXISTING]`
- **Purpose**: Explains the studio offer beneath the headline.
- **Location**: Home page → Hero → Paragraph
- **Current content**:
  > An independent digital studio focused on designing and engineering thoughtful websites, digital products, and practical business software. Understand the problem before choosing the technology.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx`
- **Notes**: Different from `site.description`; this version uses “focused on designing and engineering” and adds the problem-first sentence. Keep the distinction deliberate.

### HOME-HERO-CTA — Home Hero Buttons

- **Status**: `[EXISTING]`
- **Purpose**: Primary and secondary hero actions.
- **Location**: Home page → Hero → Button row
- **Current content**:
  > Let’s Talk → /contact
  > Explore Our Work → /work
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`ActionLink`)
- **Notes**: Primary is solid; secondary is outline. Both use uppercase monospace labels.

### HOME-SIGNAL-CARD — Studio Signal Card

- **Status**: `[CONFLICT]`
- **Purpose**: The small credibility card in the hero’s right column.
- **Location**: Home page → Hero → Studio signal card
- **Current content**:
  > Label: Studio signal
  > Title: Small by design. Senior by default.
  > Model: Remote-first
  > Base: Vadodara & Surat
  > Focus: Systems + craft
  > Status: Open for work
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (hero card)
- **Notes**: “Base” uses `Vadodara & Surat`, conflicting with the rest of the site. “Status: Open for work” is a variant of `site.availability`.

### HOME-STAT-01 — Home Metric: Deterministic Systems

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: First card in the metrics strip beneath the tech sandbox.
- **Location**: Home page → Metrics strip → Card 1
- **Current content**:
  > Label: Deterministic Systems
  > Value: 100%
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (metrics section)
- **Notes**: No methodology or evidence is published for “100%”. Confirm what it measures or replace it with a verifiable statement.

### HOME-STAT-02 — Home Metric: Target Latency & Zero Slop

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: Second card in the metrics strip.
- **Location**: Home page → Metrics strip → Card 2
- **Current content**:
  > Label: Target Latency & Zero Slop
  > Value: < 100ms
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (metrics section)
- **Notes**: “Target Latency” signals an aspirational target, but the card presents `< 100ms` like a measured result. Clarify the claim and its context.

### HOME-STAT-03 — Home Metric: Founding Builders

- **Status**: `[CONFLICT]`
- **Purpose**: Third card in the metrics strip.
- **Location**: Home page → Metrics strip → Card 3
- **Current content**:
  > Label: Founding Builders (Vadodara & Surat)
  > Value: 3
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (metrics section)
- **Notes**: The count of 3 matches the founder roster. The location conflicts with “Ahmedabad & Surat”.

### HOME-WORK-SECTION — “Selected Work” Section Heading

- **Status**: `[EXISTING]`
- **Purpose**: Heading block introducing the featured work on the home page.
- **Location**: Home page → Selected work → Section heading
- **Current content**:
  > Index: 01
  > Label: Selected work
  > Title: Work that earns its place.
  > Description: A small index of real projects: open-source tools, systems labs, hardware notes, and the studio site itself. No invented clients, no borrowed logos.
  > Link: View all work → /work
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`SectionHeading`)
- **Notes**: The description reinforces the no-invented-clients policy. Keep it consistent with the Work page intro.

### HOME-WORK-FEATURED-CTA — Featured Project Card Action Label

- **Status**: `[EXISTING]`
- **Purpose**: The action label on the large featured project card.
- **Location**: Home page → Selected work → Featured project card
- **Current content**:
  > Open case study
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx`
- **Notes**: Opens the project drawer rather than a separate route. The same card displays the project’s classification, category/year, title, summary, and first four tags from `src/data/work.ts`.

### HOME-PHILOSOPHY-SECTION — “Studio Philosophy” Section Heading

- **Status**: `[EXISTING]`
- **Purpose**: Introduces the three philosophy cards.
- **Location**: Home page → Studio philosophy → Section heading
- **Current content**:
  > Eyebrow: 02 / Studio philosophy
  > Title: Practical depth over decorative noise.
  > Description: We build for the version of the product that has real users, incomplete content, and a budget. Craft matters because it keeps the system understandable.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`philosophy` section)
- **Notes**: The eyebrow number 02 is part of the home-page section sequence.

### HOME-PHILOSOPHY-01 — Philosophy Card: Problem Before Stack

- **Status**: `[EXISTING]`
- **Purpose**: First philosophy card.
- **Location**: Home page → Studio philosophy → Card 01
- **Current content**:
  > 01
  > Problem before stack
  > The problem decides the architecture. We do not begin with a favourite framework and reverse-engineer a reason to use it.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`philosophy[0]`)
- **Notes**: Number is generated from the data order.

### HOME-PHILOSOPHY-02 — Philosophy Card: Proportional Systems

- **Status**: `[EXISTING]`
- **Purpose**: Second philosophy card.
- **Location**: Home page → Studio philosophy → Card 02
- **Current content**:
  > 02
  > Proportional systems
  > The build should be as complex as the problem and no more. Small, legible systems outlast clever ones nobody can maintain.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`philosophy[1]`)
- **Notes**: Keep the comparison structure if editing.

### HOME-PHILOSOPHY-03 — Philosophy Card: No Borrowed Credibility

- **Status**: `[EXISTING]`
- **Purpose**: Third philosophy card.
- **Location**: Home page → Studio philosophy → Card 03
- **Current content**:
  > 03
  > No borrowed credibility
  > No invented clients, fake metrics, or decorative testimonials. If it is on this site, it is real enough to explain.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`philosophy[2]`)
- **Notes**: This statement conflicts with adding unverified metrics or testimonials. Resolve the policy before adding third-party proof.

### HOME-SERVICES-SECTION — “Capabilities” Section Heading

- **Status**: `[EXISTING]`
- **Purpose**: Introduces the four service cards on the home page.
- **Location**: Home page → Capabilities → Section heading
- **Current content**:
  > Index: 03
  > Label: Capabilities
  > Title: Four ways we help.
  > Description: The studio is deliberately small. That keeps strategy, design, and engineering in the same conversation instead of handing the problem between departments.
  > Link: Explore services → /services
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`SectionHeading`)
- **Notes**: Service card titles, summaries, indexes, and first three tags come from `src/data/services.ts`.

### HOME-PROCESS-SECTION — “How We Work” Section Heading

- **Status**: `[EXISTING]`
- **Purpose**: Introduces the seven-step process rail.
- **Location**: Home page → How we work → Section heading
- **Current content**:
  > Index: 04
  > Label: How we work
  > Title: A process with no black boxes.
  > Description: Seven steps, one written source of truth, and checkpoints before surprises become expensive.
  > Link: See the full process → /how-we-work
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`SectionHeading`); `src/components/astrava/process-rail.tsx`
- **Notes**: The rail displays each step’s index, title, and summary from `src/data/process.ts`.

### HOME-FAQ-SECTION — “Questions” Section Heading

- **Status**: `[EXISTING]`
- **Purpose**: Introduces the FAQ preview on the home page.
- **Location**: Home page → Questions → Section heading
- **Current content**:
  > Index: 05
  > Label: Questions
  > Title: The things people ask before we start.
  > Description: Straight answers on pricing, revisions, ownership, and what happens after launch.
  > Link: Read all FAQs → /faq
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx` (`SectionHeading`)
- **Notes**: Only the first four FAQ items are shown on the home page (`faqs.slice(0, 4)`).

### HOME-FAQ-ASIDE — Home FAQ Aside Copy

- **Status**: `[EXISTING]`
- **Purpose**: Supporting copy and secondary CTA beside the FAQ preview.
- **Location**: Home page → Questions → Left column
- **Current content**:
  > If your question is not here, ask it directly. A good first message is usually shorter than people expect.
  > Ask us anything → /contact
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx`
- **Notes**: The same “good first message” idea appears on the FAQ page. Keep the repeats aligned.

### HOME-MISSING-TESTIMONIALS — Home Page Testimonials / Client Proof

- **Status**: `[MISSING]`
- **Purpose**: A credible third-party proof section on the highest-traffic page.
- **Location**: Home page → Between selected work and philosophy (no current section)
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No component or data source exists. See `GLOBAL-MISSING-CLIENT-TESTIMONIALS`.
- **Notes**: The current philosophy explicitly rejects decorative testimonials. If real, permission-cleared testimonials are available, add them with client name, role, company, and project context. If not, do not fabricate.

---

## 8. Work Index Page

### WORK-SEO — Work Page SEO Title & Description

- **Status**: `[EXISTING]`
- **Purpose**: Browser title and search/social description for `/work`.
- **Location**: Work page → Metadata
- **Current content**:
  > Title: Work — ASTRAVA
  > Description: Selected work from ASTRAVA: open-source tooling, systems labs, hardware notes, and studio builds. Real projects, described honestly.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkPage.tsx` (`usePageMeta`)
- **Notes**: The JSON-LD for this page is a `CollectionPage` with an `ItemList` generated from the five project records.

### WORK-INTRO — Work Page Intro

- **Status**: `[EXISTING]`
- **Purpose**: Page heading and introduction above the filter bar.
- **Location**: Work page → Page intro
- **Current content**:
  > Eyebrow: [ Selected work / 2026 ]
  > Title: Heavy on ideas.
  > Light on boring.
  > Description: A working index of real projects: open-source tools, systems labs, hardware notes, and the studio site itself. Every entry is something we actually built and can explain.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkPage.tsx` (`PageIntro`)
- **Notes**: The title is forced onto two lines. The eyebrow year is hard-coded.

### WORK-INTRO-META — Work Page Intro Metadata

- **Status**: `[EXISTING]`
- **Purpose**: Four summary facts displayed beside the Work page intro.
- **Location**: Work page → Page intro → Metadata grid
- **Current content**:
  > Projects: 05
  > Disciplines: Software, web, systems
  > Status: Independent work
  > Last update: 2026
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkPage.tsx` (`PageIntro meta`)
- **Notes**: “Projects: 05” is hard-coded and must change when the number of published projects changes. “Independent work” aligns with the current absence of client case studies.

### WORK-FILTER — Work Filter Labels

- **Status**: `[EXISTING]`
- **Purpose**: Category filters above the project grid.
- **Location**: Work page → Filter bar
- **Current content**:
  > Filter
  > All
  > Open source
  > Systems lab
  > Infrastructure lab
  > Hardware lab
  > Studio build
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkPage.tsx` (`filters`); `src/data/work.ts` (`category`)
- **Notes**: The filter list is derived from project categories; “All” is added manually. A new category in the data automatically appears as a new filter button.

### WORK-EMPTY — Work Empty State

- **Status**: `[EXISTING]`
- **Purpose**: Message shown when the active filter has no projects.
- **Location**: Work page → Project grid → Empty state
- **Current content**:
  > No projects in this category yet.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkPage.tsx`
- **Notes**: The current data means this state is not reachable through the generated filters, but it remains as a fallback.

### WORK-MISSING-RASTER-SCREENSHOTS — Real Project Screenshots

- **Status**: `[MISSING]`
- **Purpose**: Real visual evidence of each project instead of abstract line artwork.
- **Location**: Work page → Project cards; Work detail pages; Project drawer
- **Current content**:
  > Not currently implemented. Every project uses a code-drawn SVG glyph (`ProjectGlyph`) with abstract labels such as “CONTEXT / PRUNE”, “REQUEST / PATH”, “GRAPH / APPLY”, “BENCH / TELEMETRY”, and “ASTRA / STUDIO”.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/project-glyph.tsx`; `src/data/work.ts` (`visual`)
- **Notes**: Supply real screenshots as raster assets (PNG/WebP/AVIF), with dimensions, crop guidance, and alt text. Do not present the abstract glyphs as screenshots in copy.

### WORK-MISSING-CLIENT-CASE-STUDIES — Client Project Case Studies

- **Status**: `[MISSING]`
- **Purpose**: Proof that the studio can deliver client work, not only independent labs.
- **Location**: Work page → Project grid
- **Current content**:
  > Not currently implemented. All five projects are classified `Independent Project`.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`WorkClassification` includes `Client Project`, `Academic Project`, and `Concept`, but only `Independent Project` is used)
- **Notes**: Only publish client work with permission. If no client work exists, keep the independent-only positioning and consider explaining it explicitly on the Work page.

---

## 9. Work Detail Pages & Project Drawer

### CASE-SEO — Work Detail SEO Pattern

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Defines how each case-study page is titled and described for search and social.
- **Location**: Work detail page → Metadata
- **Current content**:
  > Title: `{Project title} — ASTRAVA`
  > Description: `{Project summary}`
  > Type: `article`
  > Canonical path: `/work/{slug}`
  > JSON-LD type: `CreativeWork`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkDetailPage.tsx` (`usePageMeta`); `src/data/work.ts`
- **Notes**: If a project slug cannot be found, the page renders the 404 content and uses the fallback metadata “Project not found” / “This project could not be found.” / path `/work`.

### CASE-BACK-LINK — “All Work” Back Link

- **Status**: `[EXISTING]`
- **Purpose**: Returns the visitor from a case study to the work index.
- **Location**: Work detail page → Top utility bar
- **Current content**:
  > All work
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkDetailPage.tsx`
- **Notes**: Preceded by a left arrow icon.

### CASE-EYEBROW — Case Study Eyebrow Pattern

- **Status**: `[EXISTING]`
- **Purpose**: Labels the current case study with its project index.
- **Location**: Work detail page → Page intro
- **Current content**:
  > [ Case study / 01 ]
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkDetailPage.tsx` (template literal)
- **Notes**: The number changes per project. Brackets are literal.

### CASE-SECTION-01 — Case Study Section 01 Labels

- **Status**: `[EXISTING]`
- **Purpose**: Labels for the problem section.
- **Location**: Work detail page → Section 01
- **Current content**:
  > 01 / The problem
  > What was not working.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkDetailPage.tsx` (`CaseSection`)
- **Notes**: The body is each project’s `problem` field.

### CASE-SECTION-02 — Case Study Section 02 Labels

- **Status**: `[EXISTING]`
- **Purpose**: Labels for the approach section.
- **Location**: Work detail page → Section 02
- **Current content**:
  > 02 / The approach
  > How we shaped the work.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkDetailPage.tsx` (`CaseSection`)
- **Notes**: The body is each project’s `approach` array, rendered as numbered blocks.

### CASE-SECTION-03 — Case Study Section 03 Labels

- **Status**: `[EXISTING]`
- **Purpose**: Labels for the system/architecture section.
- **Location**: Work detail page → Section 03
- **Current content**:
  > 03 / The system
  > How the pieces fit.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkDetailPage.tsx` (`CaseSection`)
- **Notes**: The body is each project’s `architecture` array, rendered as a two-column grid.

### CASE-SECTION-04 — Case Study Section 04 Labels

- **Status**: `[EXISTING]`
- **Purpose**: Labels for the details/tags/links section.
- **Location**: Work detail page → Section 04
- **Current content**:
  > 04 / Details
  > Built with intent.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkDetailPage.tsx`
- **Notes**: Displays all project tags and all project links. Contribution, outcomes, and limitations are not shown on the full detail page; they appear in the drawer.

### CASE-PREV-NEXT — Previous / Next Project Labels

- **Status**: `[EXISTING]`
- **Purpose**: Navigation between adjacent case studies.
- **Location**: Work detail page → Bottom navigation
- **Current content**:
  > Previous project
  > Next project
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/WorkDetailPage.tsx`; `src/data/work.ts` (`getAdjacentProjects`)
- **Notes**: Wraps around the project list: the first project’s previous is the last project, and vice versa.

### DRAWER-HEADER — Project Drawer Header

- **Status**: `[EXISTING]`
- **Purpose**: Header block inside the project drawer opened from the home and work pages.
- **Location**: Shared → Project drawer → Header
- **Current content**:
  > Case study / 01
  > {Project title}
  > {Project subtitle}
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/project-drawer.tsx`
- **Notes**: The index and title/subtitle come from the selected project. Close button accessible label is “Close case study”.

### DRAWER-SECTIONS — Project Drawer Section Labels

- **Status**: `[EXISTING]`
- **Purpose**: Section headings inside the project drawer.
- **Location**: Shared → Project drawer → Body
- **Current content**:
  > 01 / Problem context
  > What was not working.
  > 02 / Core approach
  > How the work was shaped.
  > 03 / Technical contribution
  > The part we built.
  > 04 / Solution architecture
  > How the pieces fit.
  > 05 / Tech badges
  > Built with intent.
  > 06 / Honest outcomes
  > What it actually delivers.
  > Limitations
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/project-drawer.tsx`
- **Notes**: Section 06 shows `outcomes` and then a limitations box. The word “Limitations” is a label above the limitations list.

### DRAWER-NAV — Project Drawer Previous / Next Labels

- **Status**: `[EXISTING]`
- **Purpose**: Adjacent-project navigation pinned to the bottom of the drawer.
- **Location**: Shared → Project drawer → Bottom bar
- **Current content**:
  > Previous project
  > Next project
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/project-drawer.tsx`
- **Notes**: Uses the same adjacent-project logic as the full case-study page.

---

## 10. Case Study Content: Five Projects

> All five records live in `src/data/work.ts` (`workProjects`). The fields below are grouped by the way they are edited and rendered. Statuses apply to the grouped field. Exact strings are preserved.

### WORK-01-IDENTITY — Project 01: Identification & Tags

- **Status**: `[EXISTING]`
- **Purpose**: The title, subtitle, classification, category, year, and tags for the first project.
- **Location**: Work page → Project card; Work detail page → Intro; Project drawer → Header
- **Current content**:
  > Index: 01
  > Slug: contextray
  > Title: contextray
  > Subtitle: Deterministic, explainable context optimization for LLM agents
  > Year: 2026
  > Category: Open source
  > Classification: Independent Project
  > Tags: Python, PyPI, Tokenizers, Ollama, Deterministic
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[0]`)
- **Notes**: The title is intentionally lowercase. `slug` is technical and controls the URL `/work/contextray`; change it only with a redirect plan. The card shows the first three tags in some layouts and the first four in the featured home card.

### WORK-01-SUMMARY — Project 01: Card Summary

- **Status**: `[EXISTING]`
- **Purpose**: The short description shown on cards and used as the page meta description.
- **Location**: Work page → Card; Home page → Featured card; Work detail → Metadata
- **Current content**:
  > A zero-dependency Python library that removes duplicate context without rewriting the content it keeps.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[0].summary`)
- **Notes**: Used verbatim as the SEO description for `/work/contextray`.

### WORK-01-CASE — Project 01: Problem, Approach & Architecture

- **Status**: `[EXISTING]`
- **Purpose**: The long-form case-study body.
- **Location**: Work detail page → Sections 01–03; Project drawer → Sections 01–04
- **Current content**:
  > **Problem**
  > Autonomous agents get trapped in tool-call retry storms. Context windows fill with repeated payloads, costs climb, and naive truncation slices through multi-byte UTF-8 sequences. Adding another LLM summarizer introduces latency, non-determinism, and a second failure surface.
  >
  > **Approach**
  > 1. Build a deterministic pruning pipeline: tokenizer-aware budgets, tool-call-aware prioritisation, byte-safe boundary detection, and an explainable audit log.
  > 2. Keep the hot path free of model calls. The library only removes exact duplicate blocks and never rewrites the content it preserves.
  > 3. Validate against real local Ollama runs rather than mock-only unit tests, with a full audit trail for every prune decision.
  >
  > **Architecture**
  > 1. Ingest and fingerprint — Normalise the message list, hash exact chunks, and protect system prompts, fenced code, JSON, and structured tool payloads.
  > 2. Budget the window — Apply a tokenizer-aware budget with role and tool-call weighting. No model call sits in the hot path.
  > 3. Prune byte-safely — Collapse duplicate chunks only after UTF-8 boundary checks. The first occurrence survives byte-for-byte.
  > 4. Explain everything — Emit a deterministic audit log: what was removed, where it came from, and how many tokens were recovered.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[0].problem`, `.approach`, `.architecture`)
- **Notes**: The full detail page shows problem, approach, and architecture. The drawer shows the same content plus contribution/outcomes/limitations. Architecture items have separate titles and bodies.

### WORK-01-DETAILS — Project 01: Contribution, Outcomes, Limitations, Meta & Links

- **Status**: `[EXISTING]`
- **Purpose**: Ownership details, honest outcome claims, limitations, factual metadata, and outbound links.
- **Location**: Project drawer → Sections 03–06; Work detail page → Tags & links
- **Current content**:
  > **Contribution**
  > Designed and implemented the deterministic pruning pipeline in Python: byte-safe boundary detection, tokenizer-aware budgeting, protected-region handling, and an explainable audit log. Published as a zero-dependency package on PyPI.
  >
  > **Outcomes**
  > - Removes exact duplicate context blocks without rewriting preserved content.
  > - Keeps model calls out of the hot path.
  > - Produces a readable audit trail for every prune decision.
  >
  > **Limitations**
  > - It does not summarise or paraphrase content; semantic redundancy is out of scope.
  > - Quality depends on the tokenizer configured for the target model.
  >
  > **Meta**
  > - Year: 2026
  > - Type: Open-source library
  > - Stack: Python, PyPI, tokenizers
  > - Status: Published
  >
  > **Links**
  > - View on GitHub → https://github.com/RudraMistry-cmd/contextray
  > - Install from PyPI → https://pypi.org/project/contextray/
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[0].contribution`, `.outcomes`, `.limitations`, `.meta`, `.links`, `.visual`)
- **Notes**: Links point to the personal GitHub account. See `GLOBAL-MISSING-STUDIO-GITHUB`. Visual variant is `contextray` (SVG glyph). If screenshots are added, update the visual system.

### WORK-02-IDENTITY — Project 02: Identification & Tags

- **Status**: `[EXISTING]`
- **Purpose**: The title, subtitle, classification, category, year, and tags for the second project.
- **Location**: Work page → Project card; Work detail page → Intro; Project drawer → Header
- **Current content**:
  > Index: 02
  > Slug: devmate
  > Title: DevMate
  > Subtitle: Containerized FastAPI, Uvicorn, and Nginx architecture
  > Year: 2026
  > Category: Systems lab
  > Classification: Independent Project
  > Tags: FastAPI, Uvicorn, Nginx, Docker, Linux
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[1]`)
- **Notes**: Slug controls `/work/devmate`. Title uses mixed case, unlike `contextray`.

### WORK-02-SUMMARY — Project 02: Card Summary

- **Status**: `[EXISTING]`
- **Purpose**: The short description shown on cards and used as the page meta description.
- **Location**: Work page → Card; Home page → Card; Work detail → Metadata
- **Current content**:
  > One compose command spins up a full local platform: Nginx ingress, static delivery, and a high-concurrency Python backend.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[1].summary`)
- **Notes**: Used verbatim as the SEO description for `/work/devmate`.

### WORK-02-CASE — Project 02: Problem, Approach & Architecture

- **Status**: `[EXISTING]`
- **Purpose**: The long-form case-study body.
- **Location**: Work detail page → Sections 01–03; Project drawer → Sections 01–04
- **Current content**:
  > **Problem**
  > Local platforms rot into a pile of terminal tabs: one process for the API, another for static files, another for a database. The request lifecycle is invisible, and nothing behaves like production until deployment day.
  >
  > **Approach**
  > 1. Design a multi-tier request path with Nginx as the only ingress. Static assets are served at the edge; API traffic is forwarded upstream.
  > 2. Run FastAPI behind Uvicorn with explicit worker settings inside an isolated Docker bridge network.
  > 3. Use health checks, named volumes, and compose-level networking so the whole stack is reproducible from a clean checkout.
  >
  > **Architecture**
  > 1. Nginx ingress — TLS termination, static asset delivery, route matching, and upstream forwarding with deliberate timeouts.
  > 2. Bridge network — Only Nginx publishes a host port. The API and its dependencies stay on an isolated Docker bridge.
  > 3. Uvicorn workers — An ASGI runtime tuned for concurrent requests, with structured startup and graceful shutdown.
  > 4. FastAPI service — Typed request models, async endpoints, and health probes that map cleanly to the container lifecycle.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[1].problem`, `.approach`, `.architecture`)
- **Notes**: The drawer also shows the technical contribution and outcomes/limitations from the details field.

### WORK-02-DETAILS — Project 02: Contribution, Outcomes, Limitations, Meta & Links

- **Status**: `[EXISTING]`
- **Purpose**: Ownership details, honest outcome claims, limitations, factual metadata, and outbound links.
- **Location**: Project drawer → Sections 03–06; Work detail page → Tags & links
- **Current content**:
  > **Contribution**
  > Built the container topology and the request path: Nginx ingress, static delivery, Uvicorn worker configuration, FastAPI services, health checks, and compose networking.
  >
  > **Outcomes**
  > - One compose command reproduces the full local platform.
  > - The request lifecycle is visible end to end.
  > - Production-like behaviour is available before deployment day.
  >
  > **Limitations**
  > - It is a local reference architecture, not a managed deployment.
  > - TLS and hosting configuration still depend on the target environment.
  >
  > **Meta**
  > - Year: 2026
  > - Type: Systems lab
  > - Stack: Python, FastAPI, Nginx, Docker
  > - Status: Working build
  >
  > **Links**
  > - View on GitHub → https://github.com/RudraMistry-cmd/DevMate
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[1].contribution`, `.outcomes`, `.limitations`, `.meta`, `.links`, `.visual`)
- **Notes**: Visual variant is `devmate`. Link points to a personal GitHub repository.

### WORK-03-IDENTITY — Project 03: Identification & Tags

- **Status**: `[EXISTING]`
- **Purpose**: The title, subtitle, classification, category, year, and tags for the third project.
- **Location**: Work page → Project card; Work detail page → Intro; Project drawer → Header
- **Current content**:
  > Index: 03
  > Slug: terraform-ollama-rig
  > Title: Declarative IaC & Local LLM Rig
  > Subtitle: Reproducible infrastructure with Terraform, Docker, and Ollama
  > Year: 2026
  > Category: Infrastructure lab
  > Classification: Independent Project
  > Tags: Terraform, Docker, Nginx, Ollama, IaC
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[2]`)
- **Notes**: Slug controls `/work/terraform-ollama-rig`. The ampersand in the title is a literal character in the data.

### WORK-03-SUMMARY — Project 03: Card Summary

- **Status**: `[EXISTING]`
- **Purpose**: The short description shown on cards and used as the page meta description.
- **Location**: Work page → Card; Home page → Card; Work detail → Metadata
- **Current content**:
  > A zero-click local environment: networks, gateways, and local inference provisioned from a single terraform apply.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[2].summary`)
- **Notes**: “terraform apply” is intentionally lowercase, matching the command name.

### WORK-03-CASE — Project 03: Problem, Approach & Architecture

- **Status**: `[EXISTING]`
- **Purpose**: The long-form case-study body.
- **Location**: Work detail page → Sections 01–03; Project drawer → Sections 01–04
- **Current content**:
  > **Problem**
  > Infrastructure demos often depend on a sequence of remembered clicks. They cannot be diffed, reviewed, or rebuilt with confidence. Local LLM experiments need the same repeatability as production infrastructure.
  >
  > **Approach**
  > 1. Let Terraform own the desired state: container networks, Nginx gateway configuration, Ollama runtime, and persistent model volumes.
  > 2. Make every apply reviewable and every destroy clean. State is treated as an artifact, not a hidden local secret.
  > 3. Expose the inference endpoint through the same gateway used by the rest of the stack, so local testing matches the deployed shape.
  >
  > **Architecture**
  > 1. Declare the graph — Providers, resources, variables, and outputs are split into readable modules with zero drift.
  > 2. Provision the network — Docker bridge networks and volume mounts are created before any container starts.
  > 3. Wire the gateway — Nginx routes model traffic to Ollama while keeping the runtime isolated from the host.
  > 4. Tear it down — A single destroy removes the full stack. No orphaned containers, no stale volumes.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[2].problem`, `.approach`, `.architecture`)
- **Notes**: The drawer also shows contribution/outcomes/limitations from the details field.

### WORK-03-DETAILS — Project 03: Contribution, Outcomes, Limitations, Meta & Links

- **Status**: `[EXISTING]`
- **Purpose**: Ownership details, honest outcome claims, limitations, factual metadata, and outbound links.
- **Location**: Project drawer → Sections 03–06; Work detail page → Tags & links
- **Current content**:
  > **Contribution**
  > Wrote the declarative Terraform graph for networks, gateway routing, Ollama runtime, and persistent volumes, with outputs and teardown included.
  >
  > **Outcomes**
  > - The environment can be planned, reviewed, applied, and destroyed.
  > - Local inference runs behind the same gateway shape as the rest of the stack.
  > - State is treated as a reviewable artifact.
  >
  > **Limitations**
  > - Model choice and hardware constraints affect inference performance.
  > - It targets a local Docker-based setup, not a cloud estate.
  >
  > **Meta**
  > - Year: 2026
  > - Type: Infrastructure lab
  > - Stack: Terraform, Docker, Nginx, Ollama
  > - Status: Working build
  >
  > **Links**
  > - GitHub profile → https://github.com/RudraMistry-cmd
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[2].contribution`, `.outcomes`, `.limitations`, `.meta`, `.links`, `.visual`)
- **Notes**: Visual variant is `terraform`. Link points to a personal GitHub profile, not a project repository. See `GLOBAL-MISSING-STUDIO-GITHUB`.

### WORK-04-IDENTITY — Project 04: Identification & Tags

- **Status**: `[EXISTING]`
- **Purpose**: The title, subtitle, classification, category, year, and tags for the fourth project.
- **Location**: Work page → Project card; Work detail page → Intro; Project drawer → Header
- **Current content**:
  > Index: 04
  > Slug: hardware-bench
  > Title: Hardware Bench & Maker Telemetry
  > Subtitle: Power supply engineering, RC RF diagnostics, and workstation mods
  > Year: 2026
  > Category: Hardware lab
  > Classification: Independent Project
  > Tags: Multimeter, Soldering, 19.5V PSU, ATX, RC TX/RX
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[3]`)
- **Notes**: Slug controls `/work/hardware-bench`. “RC RF” is rendered without punctuation between the terms.

### WORK-04-SUMMARY — Project 04: Card Summary

- **Status**: `[EXISTING]`
- **Purpose**: The short description shown on cards and used as the page meta description.
- **Location**: Work page → Card; Home page → Card; Work detail → Metadata
- **Current content**:
  > Bench notes from real hardware: current-sense pins, motor loads, ATX conversions, and RF modules repurposed with intent.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[3].summary`)
- **Notes**: Used verbatim as the SEO description for `/work/hardware-bench`.

### WORK-04-CASE — Project 04: Problem, Approach & Architecture

- **Status**: `[EXISTING]`
- **Purpose**: The long-form case-study body.
- **Location**: Work detail page → Sections 01–03; Project drawer → Sections 01–04
- **Current content**:
  > **Problem**
  > A laptop adapter is not just two wires. Multi-wire connectors carry current-sense and ID signals, and guessing wrong can brown out a load, trip a protection circuit, or kill a bench session.
  >
  > **Approach**
  > 1. Map every conductor before applying a load. Identify the current-sense and ID pins, then verify the adapter's behaviour under controlled current draw.
  > 2. Load-test DC motors against both adapter and ATX rails while logging voltage sag, ripple, and thermal rise.
  > 3. Repurpose RC transmitter and receiver modules for bench telemetry, then fold the findings into custom LED and ergonomic desk mods.
  >
  > **Architecture**
  > 1. Identify the pins — Continuity, voltage, and resistance checks separate power, ground, current-sense, and ID lines.
  > 2. Load within limits — Controlled motor loads reveal the adapter's real current ceiling and the point where protection kicks in.
  > 3. Capture telemetry — Multimeter readings and RC link diagnostics turn a one-off repair into repeatable bench data.
  > 4. Ship the mod — Custom LED rails, cable management, and desk ergonomics are treated as part of the system, not an afterthought.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[3].problem`, `.approach`, `.architecture`)
- **Notes**: Contains contractions (“adapter's”). Preserve the straight apostrophe if editing, or normalise the entire site deliberately.

### WORK-04-DETAILS — Project 04: Contribution, Outcomes, Limitations, Meta & Links

- **Status**: `[EXISTING]`
- **Purpose**: Ownership details, honest outcome claims, limitations, factual metadata, and outbound links.
- **Location**: Project drawer → Sections 03–06; Work detail page → Tags & links
- **Current content**:
  > **Contribution**
  > Mapped adapter conductors, load-tested motor rails, captured multimeter and RC-link telemetry, and folded the findings into bench and desk modifications.
  >
  > **Outcomes**
  > - Adapter behaviour is understood before a load is attached.
  > - Bench measurements are repeatable rather than guessed.
  > - Modifications are documented as part of the system.
  >
  > **Limitations**
  > - Findings are specific to the adapters and loads tested.
  > - This is bench documentation, not a certified electrical design.
  >
  > **Meta**
  > - Year: 2026
  > - Type: Hardware lab
  > - Tools: Multimeter, soldering, PSU, RC TX/RX
  > - Status: Ongoing notes
  >
  > **Links**
  > - GitHub profile → https://github.com/RudraMistry-cmd
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[3].contribution`, `.outcomes`, `.limitations`, `.meta`, `.links`, `.visual`)
- **Notes**: Visual variant is `hardware`. The limitation “not a certified electrical design” is an important safety disclaimer; do not remove it without review.

### WORK-05-IDENTITY — Project 05: Identification & Tags

- **Status**: `[EXISTING]`
- **Purpose**: The title, subtitle, classification, category, year, and tags for the fifth project.
- **Location**: Work page → Project card; Work detail page → Intro; Project drawer → Header
- **Current content**:
  > Index: 05
  > Slug: astrava-studio
  > Title: ASTRAVA Studio Site
  > Subtitle: Editorial identity, real case studies, and a secure inquiry pipeline
  > Year: 2026
  > Category: Studio build
  > Classification: Independent Project
  > Tags: React, Vite, TypeScript, Express, SEO
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[4]`)
- **Notes**: This is the self-referential studio-site project. If the site changes significantly, update or retire this case study. Slug controls `/work/astrava-studio`.

### WORK-05-SUMMARY — Project 05: Card Summary

- **Status**: `[EXISTING]`
- **Purpose**: The short description shown on cards and used as the page meta description.
- **Location**: Work page → Card; Home page → Card; Work detail → Metadata
- **Current content**:
  > The studio's own site: a considered editorial system, five real projects, and a server-validated lead capture flow.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[4].summary`)
- **Notes**: “five real projects” will become inaccurate when a sixth project is published. Update this summary when the index grows.

### WORK-05-CASE — Project 05: Problem, Approach & Architecture

- **Status**: `[CONFLICT]`
- **Purpose**: The long-form case-study body.
- **Location**: Work detail page → Sections 01–03; Project drawer → Sections 01–04
- **Current content**:
  > **Problem**
  > A studio site has to do more than look designed. It has to explain the work honestly, make the offer legible, and capture qualified inquiries without exposing private contact details or pretending the studio is larger than it is.
  >
  > **Approach**
  > 1. Build an editorial system around a serif display face, a restrained sans, and a monospace utility layer. Use charcoal, warm white, and electric blue as a single coherent palette.
  > 2. Publish only real projects and real capabilities. No invented clients, awards, testimonials, or performance claims.
  > 3. Treat the inquiry form as a product surface: clear labels, inline validation, a honeypot, rate limiting, server-side acceptance, and a receipt only after the server confirms.
  >
  > **Architecture**
  > 1. Route shell — React Router with lazy-loaded pages, a shared editorial layout, reduced-motion-aware transitions, and per-route metadata.
  > 2. Content layer — Typed project, service, process, founder, and FAQ data keeps copy consistent across pages and case studies.
  > 3. Inquiry API — An Express endpoint validates with Zod, rate-limits by IP, rejects honeypot submissions, and stores accepted inquiries as JSONL.
  > 4. Publishing layer — Canonical URLs, Open Graph metadata, JSON-LD, sitemap, robots, privacy, and terms ship with the site rather than after it.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[4].problem`, `.approach`, `.architecture`)
- **Notes**: **Conflict:** the approach says the palette uses “electric blue”, but the actual codebase uses a terracotta/orange accent (`#E05A3E`) with warm white and charcoal. Update the copy or the design. See `CONFLICT-02` in the conflict register.

### WORK-05-DETAILS — Project 05: Contribution, Outcomes, Limitations, Meta & Links

- **Status**: `[EXISTING]`
- **Purpose**: Ownership details, honest outcome claims, limitations, factual metadata, and outbound links.
- **Location**: Project drawer → Sections 03–06; Work detail page → Tags & links
- **Current content**:
  > **Contribution**
  > Designed and engineered the editorial system, typed content layer, route shell, inquiry API, and publishing metadata as one codebase.
  >
  > **Outcomes**
  > - Real projects are presented with honest classification and limitations.
  > - The inquiry flow validates, rate-limits, and stores accepted submissions.
  > - SEO, privacy, and terms ship with the site.
  >
  > **Limitations**
  > - The index grows only when a project is real enough to document.
  > - Performance claims are intentionally absent until they can be measured.
  >
  > **Meta**
  > - Year: 2026
  > - Type: Studio site
  > - Stack: React, Vite, Express
  > - Status: Production build
  >
  > **Links**
  > - Start a project → /contact
  > - See all work → /work
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[4].contribution`, `.outcomes`, `.limitations`, `.meta`, `.links`, `.visual`)
- **Notes**: Visual variant is `astrava`. The internal links are routed through React Router. The limitation “Performance claims are intentionally absent until they can be measured” conflicts with the home-page `100%` and `< 100ms` metrics; resolve that policy inconsistency.

---

## 11. Services Page & Service Catalog

### SERVICES-SEO — Services Page SEO Title & Description

- **Status**: `[EXISTING]`
- **Purpose**: Browser title and search/social description for `/services`.
- **Location**: Services page → Metadata
- **Current content**:
  > Title: Services — ASTRAVA
  > Description: Custom software, high-performance websites, UI/UX product design, and workflow automation from ASTRAVA, an independent digital studio.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ServicesPage.tsx` (`usePageMeta`)
- **Notes**: The JSON-LD is an `OfferCatalog` built from the four service records.

### SERVICES-INTRO — Services Page Intro

- **Status**: `[EXISTING]`
- **Purpose**: Page heading and introduction above the service list.
- **Location**: Services page → Page intro
- **Current content**:
  > Eyebrow: [ Services / What we do ]
  > Title: Websites, products,
  > and the systems behind them.
  > Description: Four service areas, one studio. We keep strategy, design, and engineering close together so the thing you launch is the thing you actually needed.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ServicesPage.tsx` (`PageIntro`)
- **Notes**: The title is forced onto two lines.

### SERVICES-INTRO-META — Services Page Intro Metadata

- **Status**: `[EXISTING]`
- **Purpose**: Four facts displayed beside the Services intro.
- **Location**: Services page → Page intro → Metadata grid
- **Current content**:
  > Focus: Design + engineering
  > Model: Project-based
  > Scope: Written quotation
  > Handover: Source + docs
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ServicesPage.tsx` (`PageIntro meta`)
- **Notes**: Keep the terse value style.

### SERVICES-CARD-LABELS — Service Card Section Labels & CTA

- **Status**: `[EXISTING]`
- **Purpose**: Reusable labels inside each service card.
- **Location**: Services page → Service cards
- **Current content**:
  > Primary focus
  > Service
  > What this can include
  > How it is scoped
  > Discuss this service → /contact
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ServicesPage.tsx`
- **Notes**: “Primary focus” is shown only for the first service (“01”); all others show “Service”. The CTA is repeated in every card.

### SERVICES-ENGAGEMENT — “Engagement Shape” Section

- **Status**: `[EXISTING]`
- **Purpose**: Explains the commercial structure after the service list.
- **Location**: Services page → Engagement shape
- **Current content**:
  > Eyebrow: Engagement shape
  > Title: Clear terms, before the work.
  > Card 01 — Fixed quotation: Scope, assumptions, timeline, and cost are written down before work starts.
  > Card 02 — Milestone payments: Larger projects are split into payments tied to visible, reviewable progress.
  > Card 03 — Clean handover: Source code, deployment notes, and documentation are part of the agreed scope.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ServicesPage.tsx` (`engagement`)
- **Notes**: Card numbers are generated (`01`, `02`, `03`). Keep the promises aligned with the FAQ and Terms.

### SERVICE-01-IDENTITY — Service 01: Custom Software & Business Applications

- **Status**: `[EXISTING]`
- **Purpose**: Service title, summary, index, and tags for the first service.
- **Location**: Home page → Capabilities card; Services page → Service 01
- **Current content**:
  > Index: 01
  > Slug: custom-software
  > Title: Custom Software & Business Applications
  > Summary: Internal tools and business systems shaped around how your team actually works.
  > Tags: Python, TypeScript, APIs, Auth / RBAC, Dashboards
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/services.ts` (`services[0]`)
- **Notes**: Slug controls the in-page anchor `/services#custom-software`. The home page shows the first three tags only.

### SERVICE-01-BODY — Service 01: Description, Inclusions & Scoping

- **Status**: `[EXISTING]`
- **Purpose**: Long description, inclusion list, audience, and scoping explanation.
- **Location**: Services page → Service 01 → Body
- **Current content**:
  > **Description**
  > When spreadsheets and disconnected tools stop scaling, we design and build the application that closes the gap. The work starts with the operating model, not the framework: who needs what, where the handoffs fail, and which decisions need a reliable system behind them.
  >
  > **What this can include**
  > - Discovery, workflow mapping, and data modelling
  > - APIs, validation, authentication, and role-based access
  > - Admin interfaces, dashboards, and operational tooling
  > - Deployment, documentation, and a clean handover
  >
  > **Good for**
  > Teams running critical work through spreadsheets, manual follow-ups, or a patchwork of disconnected tools.
  >
  > **How it is scoped**
  > Scoped as a written engagement after workflow mapping. The quotation states modules, integrations, access roles, and acceptance checks before development starts.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/services.ts` (`services[0].description`, `.includes`, `.goodFor`, `.scoping`)
- **Notes**: “Good for” is not labeled visibly in the UI; it appears as a muted paragraph under the service title. Inclusions are bulleted with an accent dot.

### SERVICE-02-IDENTITY — Service 02: Web Development & High-Performance Websites

- **Status**: `[EXISTING]`
- **Purpose**: Service title, summary, index, and tags for the second service.
- **Location**: Home page → Capabilities card; Services page → Service 02
- **Current content**:
  > Index: 02
  > Slug: web-development
  > Title: Web Development & High-Performance Websites
  > Summary: Editorial websites and product surfaces built for clarity, speed, and long-term upkeep.
  > Tags: React, Vite, TypeScript, Tailwind CSS, SEO
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/services.ts` (`services[1]`)
- **Notes**: Slug controls `/services#web-development`. The home page shows the first three tags only.

### SERVICE-02-BODY — Service 02: Description, Inclusions & Scoping

- **Status**: `[EXISTING]`
- **Purpose**: Long description, inclusion list, audience, and scoping explanation.
- **Location**: Services page → Service 02 → Body
- **Current content**:
  > **Description**
  > A website is often the first serious interaction someone has with your business. We treat it that way: structure the story, design the reading experience, and engineer the frontend so it stays fast, accessible, and easy to extend after launch.
  >
  > **What this can include**
  > - Information architecture and content structure
  > - Responsive interface design and frontend engineering
  > - Performance, accessibility, and SEO fundamentals
  > - Analytics-ready builds with clear deployment notes
  >
  > **Good for**
  > Studios, product teams, and service businesses that need a site with a point of view and a solid technical base.
  >
  > **How it is scoped**
  > Scoped by page count, content readiness, integrations, and launch requirements. Design and build are quoted together, with clear assumptions about copy and assets.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/services.ts` (`services[1].description`, `.includes`, `.goodFor`, `.scoping`)
- **Notes**: “Analytics-ready builds” does not mean the studio adds analytics by default; the Privacy Notice says no analytics scripts are used. Clarify if needed.

### SERVICE-03-IDENTITY — Service 03: UI/UX & Product Design

- **Status**: `[EXISTING]`
- **Purpose**: Service title, summary, index, and tags for the third service.
- **Location**: Home page → Capabilities card; Services page → Service 03
- **Current content**:
  > Index: 03
  > Slug: ui-ux-product-design
  > Title: UI/UX & Product Design
  > Summary: Product flows and interfaces that make complex work feel legible.
  > Tags: UX, UI, Design systems, Prototyping, Accessibility
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/services.ts` (`services[2]`)
- **Notes**: Slug controls `/services#ui-ux-product-design`. The home page shows the first three tags only.

### SERVICE-03-BODY — Service 03: Description, Inclusions & Scoping

- **Status**: `[EXISTING]`
- **Purpose**: Long description, inclusion list, audience, and scoping explanation.
- **Location**: Services page → Service 03 → Body
- **Current content**:
  > **Description**
  > Good interface design removes uncertainty. We map the journey, test the assumptions, and shape the screens around the decisions people need to make. Visual craft matters, but it has to survive real content, real edge cases, and real devices.
  >
  > **What this can include**
  > - User flows, wireframes, and interaction models
  > - Visual systems, typography, and component direction
  > - Responsive interface design and prototypes
  > - Design documentation for engineering handoff
  >
  > **Good for**
  > Products with a strong idea but an unclear interface, or teams preparing a build that needs design direction first.
  >
  > **How it is scoped**
  > Scoped by the number of core flows and screens. The proposal defines the revision rounds and the handoff format so design effort does not drift.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/services.ts` (`services[2].description`, `.includes`, `.goodFor`, `.scoping`)
- **Notes**: Keep the distinction between design direction and full frontend build clear.

### SERVICE-04-IDENTITY — Service 04: Workflow Automation & AI-Powered Applications

- **Status**: `[EXISTING]`
- **Purpose**: Service title, summary, index, and tags for the fourth service.
- **Location**: Home page → Capabilities card; Services page → Service 04
- **Current content**:
  > Index: 04
  > Slug: workflow-automation
  > Title: Workflow Automation & AI-Powered Applications
  > Summary: Practical automation and AI features with guardrails, not theatre.
  > Tags: Python, Automation, LLM tools, Integrations, Guardrails
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/services.ts` (`services[3]`)
- **Notes**: Slug controls `/services#workflow-automation`. “Theatre” is a deliberate brand tone; preserve unless the voice changes.

### SERVICE-04-BODY — Service 04: Description, Inclusions & Scoping

- **Status**: `[EXISTING]`
- **Purpose**: Long description, inclusion list, audience, and scoping explanation.
- **Location**: Services page → Service 04 → Body
- **Current content**:
  > **Description**
  > Automation is useful when it removes a real bottleneck and leaves a person in control of the outcome. We build integrations, scripts, and AI-assisted tools around a defined workflow, with validation, logging, and fallback paths so the system is understandable when something goes wrong.
  >
  > **What this can include**
  > - Workflow audits and automation opportunity mapping
  > - Python automation, integrations, and scheduled jobs
  > - AI-assisted tools with validation and human review
  > - Operational dashboards and failure visibility
  >
  > **Good for**
  > Teams repeating the same manual steps across email, spreadsheets, documents, or internal tools.
  >
  > **How it is scoped**
  > Scoped after an automation audit. Only workflows with a measurable manual cost and a safe fallback path are proposed for build.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/services.ts` (`services[3].description`, `.includes`, `.goodFor`, `.scoping`)
- **Notes**: No AI performance or accuracy claims are made. Keep it that way unless measured evidence exists.

---

## 12. About Page & Founder Profiles

### ABOUT-SEO — About Page SEO Title & Description

- **Status**: `[CONFLICT]`
- **Purpose**: Browser title and search/social description for `/about`.
- **Location**: About page → Metadata
- **Current content**:
  > Title: About — ASTRAVA
  > Description: ASTRAVA is an independent, remote-first digital studio founded by Mistry Rudra, Patel Karan, and Darji Harsh, with roots in Ahmedabad and Surat.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/AboutPage.tsx` (`usePageMeta`)
- **Notes**: The description contains “Ahmedabad and Surat”, one of the conflicting location strings. Resolve with `GLOBAL-CONFLICT-LOCATION`.

### ABOUT-INTRO — About Page Intro

- **Status**: `[CONFLICT]`
- **Purpose**: Page heading, introduction, and summary metadata.
- **Location**: About page → Page intro
- **Current content**:
  > Eyebrow: [ About / The studio ]
  > Title: A small studio
  > for work that has to hold up.
  > Description: ASTRAVA is an independent digital studio. We design and engineer websites, digital products, and business software with a bias toward clarity, useful systems, and work that survives contact with the real world.
  > Founded by: Three partners
  > Model: Remote-first
  > Base: Ahmedabad & Surat
  > Focus: Design + engineering
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/AboutPage.tsx` (`PageIntro`)
- **Notes**: “Base” uses `site.studioLocation`, which conflicts with the header/home “Vadodara & Surat”. The title is forced onto two lines.

### ABOUT-STUDIO — Section 01: The Studio

- **Status**: `[CONFLICT]`
- **Purpose**: The studio-origin and operating-model section.
- **Location**: About page → 01 / The studio
- **Current content**:
  > Eyebrow: 01 / The studio
  > Lead: We would rather understand the problem than decorate the answer.
  > Paragraph 1: ASTRAVA was founded by Mistry Rudra, Patel Karan, and Darji Harsh. The studio is deliberately small: the people who shape the thinking are close to the people who build the thing.
  > Paragraph 2: We work remote-first, with roots in Ahmedabad and Surat. That model gives us access to focused, senior work without the overhead of a large agency. It also means written clarity matters more than performative meetings.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/AboutPage.tsx`
- **Notes**: Paragraph 2 contains “Ahmedabad and Surat”, conflicting with the header/home city pair. Uses “and” rather than an ampersand.

### ABOUT-NAME — Section 02: The Name

- **Status**: `[EXISTING]`
- **Purpose**: Explains the ASTRAVA name and its design philosophy.
- **Location**: About page → 02 / The name
- **Current content**:
  > Eyebrow: 02 / The name
  > Title: A fixed point to navigate by.
  > Paragraph 1: The name draws on the Sanskrit word astra — an instrument with a defined purpose. We take the useful part of that idea: precision, capability, and craftsmanship. Not a literal weapon, and not a decoration in the sky.
  > Paragraph 2: It is also a standard for the work. A good instrument is not impressive because it is loud. It is useful because it is consistent, legible, and reliable in the hands of the person using it. We aim for the same qualities in the systems we build.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/AboutPage.tsx`; `src/components/astrava/astra-mark.tsx`
- **Notes**: The word “astra” is italicised with `<em>` in the rendered page. The em dash is part of the copy. A decorative Astra mark sits beside the section label.

### ABOUT-PRINCIPLES — Section 03: Principles

- **Status**: `[EXISTING]`
- **Purpose**: The four decision-making principles displayed on the About page.
- **Location**: About page → 03 / Principles
- **Current content**:
  > Eyebrow: 03 / Principles
  > Title: How we make decisions.
  >
  > 01 — Understand first: The problem decides the stack, the scope, and the design. We do not start with a preferred technology and work backwards.
  > 02 — One conversation: Design and engineering sit in the same room. Decisions do not get lost between a mockup, a ticket, and a build.
  > 03 — Write it down: Scope, assumptions, revisions, and support are documented. Clarity is cheaper than rework.
  > 04 — Leave you in control: Handover includes the source, the deployment notes, and the context you need to keep moving without us.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/AboutPage.tsx` (`principles`)
- **Notes**: Numbers are generated (`01`–`04`). Keep each principle body to a compact paragraph; the cards sit in a two-column grid on larger screens.

### ABOUT-FOUNDERS-SECTION — Section 04: The Founders Heading

- **Status**: `[EXISTING]`
- **Purpose**: Heading block above the founder cards.
- **Location**: About page → 04 / The founders
- **Current content**:
  > Index: 04
  > Label: The founders
  > Title: Three people, one standard.
  > Description: No account layer, no handoff to a junior team. The founders are the studio.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/AboutPage.tsx` (`SectionHeading`)
- **Notes**: The description makes a staffing promise. Only keep it if the studio will not pass work to junior staff or subcontractors.

### ABOUT-FOUNDER-01 — Founder: Mistry Rudra

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: First founder card.
- **Location**: About page → The founders → Card 01
- **Current content**:
  > Initials: MR
  > Name: Mistry Rudra
  > Role: Co-founder / Systems & Backend
  > Focus: Architecture, APIs, validation, auth and RBAC, automation, and technical planning.
  > Skills: Backend, Logic, Architecture, APIs, Validation, Auth / RBAC, Automation, Python automation, Technical planning
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/founders.ts` (`founders[0]`)
- **Notes**: The card uses initials in a monogram instead of a photo. See `ABOUT-MISSING-FOUNDER-PHOTOS` and `ABOUT-MISSING-FOUNDER-BIOS`. Confirm name order and role wording.

### ABOUT-FOUNDER-02 — Founder: Patel Karan

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: Second founder card.
- **Location**: About page → The founders → Card 02
- **Current content**:
  > Initials: PK
  > Name: Patel Karan
  > Role: Co-founder / Design & Frontend
  > Focus: Interface design, frontend implementation, and the bridge between product intent and the built screen.
  > Skills: Design / UI / UX, Frontend, SQL, Python, Java, React, CSS, Vite, JavaScript, Angular, Power BI
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/founders.ts` (`founders[1]`)
- **Notes**: Eleven skill tags are rendered. On small screens the tags wrap extensively; consider trimming if the card becomes too tall. Confirm credentials and name order.

### ABOUT-FOUNDER-03 — Founder: Darji Harsh

- **Status**: `[NEEDS CONFIRMATION]`
- **Purpose**: Third founder card.
- **Location**: About page → The founders → Card 03
- **Current content**:
  > Initials: DH
  > Name: Darji Harsh
  > Role: Co-founder / Frontend
  > Focus: Frontend implementation with a growing interest in the details that make an interface feel finished.
  > Skills: Frontend, Python, Java, C, HTML, CSS, JavaScript, Tailwind
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/founders.ts` (`founders[2]`)
- **Notes**: The phrase “growing interest” reads as a junior positioning. Confirm whether that is intentional. See missing photos/bios.

### ABOUT-MISSING-FOUNDER-PHOTOS — Founder Photographs

- **Status**: `[MISSING]`
- **Purpose**: Real portraits for the founder cards and About page credibility.
- **Location**: About page → The founders
- **Current content**:
  > Not currently implemented. Each founder card uses an initials monogram (`MR`, `PK`, `DH`) with a decorative Astra mark.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/monogram.tsx`; `src/pages/AboutPage.tsx`
- **Notes**: Supply professional, consistent portraits with permissions, crop ratios, and alt text. Do not use AI-generated likenesses of real people.

### ABOUT-MISSING-FOUNDER-BIOS — Founder Long-Form Bios & Credentials

- **Status**: `[MISSING]`
- **Purpose**: Deeper credibility beyond role, focus, and skill tags.
- **Location**: About page → The founders
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/founders.ts` (no bio/education/experience fields exist)
- **Notes**: If adding bios, extend the `Founder` type and card layout. Include only verifiable education, employers, certifications, and years of experience.

### ABOUT-REMOTE — Section 05: Remote-First

- **Status**: `[CONFLICT]`
- **Purpose**: Explains the studio’s distributed operating model.
- **Location**: About page → 05 / Remote-first
- **Current content**:
  > Eyebrow: 05 / Remote-first
  > Title: Distributed by design.
  > Paragraph 1: Remote-first is not a slogan for us. It is how the studio operates: written decisions, shared context, and deliberate checkpoints instead of relying on who happened to be in the room.
  > Paragraph 2: We are based in India, with roots across Ahmedabad and Surat. We work with teams wherever the problem is. If a project needs overlap hours, we agree on them before kickoff rather than discovering the gap halfway through.
  > CTA: Talk to the studio → mailto:hello@astrava.studio
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/AboutPage.tsx`; `site.email`
- **Notes**: Paragraph 2 contains the conflicting “Ahmedabad and Surat” location. The CTA opens the studio email directly.

---

## 13. How We Work Page & Process Steps

### PROCESS-SEO — How We Work Page SEO Title & Description

- **Status**: `[EXISTING]`
- **Purpose**: Browser title and search/social description for `/how-we-work`.
- **Location**: How We Work page → Metadata
- **Current content**:
  > Title: How We Work — ASTRAVA
  > Description: The ASTRAVA process: inquiry, discovery, written proposal, kickoff, design and development checkpoints, QA, and handover with defined support.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ProcessPage.tsx` (`usePageMeta`)
- **Notes**: The JSON-LD is a `HowTo` with seven `HowToStep` entries and URLs ending in `#step-01` through `#step-07`.

### PROCESS-INTRO — How We Work Page Intro

- **Status**: `[EXISTING]`
- **Purpose**: Page heading and introduction above the interactive process selector.
- **Location**: How We Work page → Page intro
- **Current content**:
  > Eyebrow: [ How we work / The process ]
  > Title: A clear process,
  > from first message
  > to final handover.
  > Description: Seven steps, with the expectations written down at each one. The process is designed to surface the important decisions early, not to hide them behind a status report.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ProcessPage.tsx` (`PageIntro`)
- **Notes**: The title is forced onto three lines. “Seven” is hard-coded and must change if the process step count changes.

### PROCESS-INTRO-META — How We Work Page Intro Metadata

- **Status**: `[EXISTING]`
- **Purpose**: Four facts displayed beside the process intro.
- **Location**: How We Work page → Page intro → Metadata grid
- **Current content**:
  > Steps: Seven
  > Proposal: Fixed quotation
  > Review: Checkpoints
  > Handover: Source + docs
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ProcessPage.tsx` (`PageIntro meta`)
- **Notes**: “Steps: Seven” duplicates the hard-coded step count in the intro and the `Step {index} / 07` counter.

### PROCESS-TIMELINE-LABELS — Process Selector Labels

- **Status**: `[EXISTING]`
- **Purpose**: Labels around the interactive step tabs and detail panel.
- **Location**: How We Work page → Process timeline
- **Current content**:
  > Timeline / Select a step
  > Step 01 / 07
  > You leave with
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ProcessPage.tsx`
- **Notes**: “Timeline” is accented; “/ Select a step” is muted. The step counter updates with the selected step. “You leave with” precedes each step’s deliverable.

### PROCESS-STEP-01 — Process Step 01: Inquiry

- **Status**: `[EXISTING]`
- **Purpose**: First step in the process.
- **Location**: Home page → Process rail; How We Work page → Step 01
- **Current content**:
  > Title: Inquiry
  > Summary: You send the messy version. We read it properly.
  > Description: Tell us what is not working, what you have tried, and what a good outcome would look like. A short note is enough to start. If the fit is unclear, we will say so rather than force a project into a template.
  > Deliverable: A clear first response and a decision on whether to talk.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/process.ts` (`processSteps[0]`)
- **Notes**: The home rail shows title and summary only. The full page shows title, summary, description, and deliverable.

### PROCESS-STEP-02 — Process Step 02: Discovery Call

- **Status**: `[EXISTING]`
- **Purpose**: Second step in the process.
- **Location**: Home page → Process rail; How We Work page → Step 02
- **Current content**:
  > Title: Discovery Call
  > Summary: A focused conversation about goals, constraints, and scope.
  > Description: We talk through the problem, the people involved, the existing systems, and the constraints that matter. This is where assumptions get tested before they become expensive.
  > Deliverable: A shared understanding of the problem and the shape of the work.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/process.ts` (`processSteps[1]`)
- **Notes**: The process does not state a call duration or platform. Add only if the studio has a standard.

### PROCESS-STEP-03 — Process Step 03: Written Proposal & Quotation

- **Status**: `[EXISTING]`
- **Purpose**: Third step in the process.
- **Location**: Home page → Process rail; How We Work page → Step 03
- **Current content**:
  > Title: Written Proposal & Quotation
  > Summary: Scope, sequence, cost, and assumptions in one document.
  > Description: You receive a written proposal that states what is included, what is not, how the work will run, and what it costs. The quotation is fixed against that scope, so there are fewer surprises later.
  > Deliverable: A fixed written quotation with a clear scope and timeline.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/process.ts` (`processSteps[2]`)
- **Notes**: “Fixed quotation” is a repeated commercial promise across the site. Keep it aligned with the Terms and FAQ.

### PROCESS-STEP-04 — Process Step 04: Agreement & Kickoff

- **Status**: `[EXISTING]`
- **Purpose**: Fourth step in the process.
- **Location**: Home page → Process rail; How We Work page → Step 04
- **Current content**:
  > Title: Agreement & Kickoff
  > Summary: The boring paperwork, handled before the work starts.
  > Description: We agree on the commercial terms, the milestone plan, the communication rhythm, and the access we need. Kickoff is a real start, not a vague promise to begin soon.
  > Deliverable: A signed agreement, milestone plan, and access checklist.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/process.ts` (`processSteps[3]`)
- **Notes**: The deliverable promises a signed agreement. Confirm the studio actually uses written agreements for every project.

### PROCESS-STEP-05 — Process Step 05: Design & Development Checkpoints

- **Status**: `[EXISTING]`
- **Purpose**: Fifth step in the process.
- **Location**: Home page → Process rail; How We Work page → Step 05
- **Current content**:
  > Title: Design & Development Checkpoints
  > Summary: Visible progress at defined review points.
  > Description: Work happens in reviewable increments. You see the direction early, test the important flows, and give feedback at agreed checkpoints rather than discovering everything at the end.
  > Deliverable: Reviewable design and build increments with documented feedback.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/process.ts` (`processSteps[4]`)
- **Notes**: No cadence (weekly, milestone-based) is stated. Add a cadence only if it is a real commitment.

### PROCESS-STEP-06 — Process Step 06: Rigorous QA

- **Status**: `[EXISTING]`
- **Purpose**: Sixth step in the process.
- **Location**: Home page → Process rail; How We Work page → Step 06
- **Current content**:
  > Title: Rigorous QA
  > Summary: The unglamorous pass that protects the launch.
  > Description: We test the build across screen sizes, browsers, keyboard paths, content edge cases, error states, and performance basics. The goal is not a perfect demo; it is a dependable release.
  > Deliverable: A QA pass, a fix list, and a release candidate.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/process.ts` (`processSteps[5]`)
- **Notes**: “QA pass” is not defined as a formal test report. Clarify if clients receive a written QA summary.

### PROCESS-STEP-07 — Process Step 07: Handover & Defined Support

- **Status**: `[EXISTING]`
- **Purpose**: Seventh step in the process.
- **Location**: Home page → Process rail; How We Work page → Step 07
- **Current content**:
  > Title: Handover & Defined Support
  > Summary: You leave with the system, not a dependency.
  > Description: You receive the source code, deployment notes, and documentation for the agreed scope. Any post-launch support is defined in writing, so ownership and expectations stay clear.
  > Deliverable: Source code, documentation, deployment notes, and agreed support.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/process.ts` (`processSteps[6]`)
- **Notes**: Support is promised only as “defined in writing”; no support window duration is published. See `GLOBAL-MISSING-HOURS` and the FAQ support answer.

### PROCESS-CONSTANTS — “What Stays Constant” Section

- **Status**: `[EXISTING]`
- **Purpose**: Three commercial/process guarantees below the step selector.
- **Location**: How We Work page → What stays constant
- **Current content**:
  > Eyebrow: What stays constant
  > Title: The terms do not move quietly.
  > Card 01 — A written source of truth: The proposal, scope, revision limits, and support terms live in one place. If it is not written down, it is not assumed.
  > Card 02 — Checkpoints before launch: You review the direction and the important flows at agreed points. Feedback happens while it can still change the outcome.
  > Card 03 — No surprise scope: New requirements are welcome. They get scoped, priced, and agreed before they enter the build.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ProcessPage.tsx` (`constants`)
- **Notes**: Card numbers are generated. The claims are commercial promises; keep them aligned with the Terms and FAQ.

### PROCESS-ARIA — Process Selector Accessible Labels

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Screen-reader labels for the process tabs and progress buttons.
- **Location**: How We Work page → Process timeline
- **Current content**:
  > Project process steps
  > Go to step 01 — Inquiry (pattern repeats for each step)
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ProcessPage.tsx`
- **Notes**: The second label is generated as `Go to step {index} — {title}`. Preserve the em dash if editing.

---

## 14. FAQ Page

### FAQ-SEO — FAQ Page SEO Title & Description

- **Status**: `[EXISTING]`
- **Purpose**: Browser title and search/social description for `/faq`.
- **Location**: FAQ page → Metadata
- **Current content**:
  > Title: FAQ — ASTRAVA
  > Description: Answers to common questions about working with ASTRAVA: pricing, quotations, revisions, source-code ownership, post-launch support, NDAs, and small projects.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/FaqPage.tsx` (`usePageMeta`)
- **Notes**: The JSON-LD is a `FAQPage` generated from all seven FAQ records.

### FAQ-INTRO — FAQ Page Intro

- **Status**: `[EXISTING]`
- **Purpose**: Page heading and introduction above the FAQ accordion.
- **Location**: FAQ page → Page intro
- **Current content**:
  > Eyebrow: [ FAQ / Straight answers ]
  > Title: Questions,
  > answered plainly.
  > Description: The commercial details should be clear before a project starts. These are the questions that come up most often. If yours is not here, ask it directly.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/FaqPage.tsx` (`PageIntro`)
- **Notes**: The title is forced onto two lines.

### FAQ-INTRO-META — FAQ Page Intro Metadata

- **Status**: `[EXISTING]`
- **Purpose**: Four facts displayed beside the FAQ intro.
- **Location**: FAQ page → Page intro → Metadata grid
- **Current content**:
  > Topics: Pricing, scope, ownership
  > Quotation: Written, fixed
  > NDA: Available
  > Support: Defined in writing
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/FaqPage.tsx` (`PageIntro meta`)
- **Notes**: “NDA: Available” is supported by the FAQ answer. “Support: Defined in writing” is supported by the process and FAQ.

### FAQ-ASIDE — FAQ Page Aside Copy

- **Status**: `[EXISTING]`
- **Purpose**: Supporting copy and CTA in the sticky sidebar.
- **Location**: FAQ page → Left aside
- **Current content**:
  > Label: Before we start
  > Title: If it is not here, ask.
  > Paragraph: A good first message is usually shorter than people expect. Tell us what is not working and what a useful outcome would look like.
  > CTA: Ask the studio → /contact
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/FaqPage.tsx`
- **Notes**: The “good first message” sentence also appears on the home page.

### FAQ-01 — FAQ: Pricing

- **Status**: `[EXISTING]`
- **Purpose**: First accordion item, also shown on the home page.
- **Location**: FAQ page → Accordion item 01; Home page → FAQ preview item 01
- **Current content**:
  > How is pricing decided?
  >
  > Pricing is quoted after discovery. The scope, complexity, number of screens, integrations, and timeline all affect the number. We do not publish a fixed price list because a generic package would either overcharge a small job or under-scope a serious one.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/faq.ts` (`faqs[0]`); `src/components/astrava/faq-accordion.tsx`
- **Notes**: First paragraph is the question; second is the answer. The home page shows the first four FAQs only.

### FAQ-02 — FAQ: Milestone Payments

- **Status**: `[EXISTING]`
- **Purpose**: Second accordion item, also shown on the home page.
- **Location**: FAQ page → Accordion item 02; Home page → FAQ preview item 02
- **Current content**:
  > How do milestone payments work?
  >
  > You receive a fixed written quotation against an agreed scope. Payments are split into milestones tied to visible progress. The advance is flexible and typically sits around 15–20% upfront, with the remainder released as checkpoints are accepted. Any work outside the agreed scope is quoted separately before it starts.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/faq.ts` (`faqs[1]`)
- **Notes**: “15–20%” uses an en dash. This is a commercial term and should be reviewed against the standard agreement.

### FAQ-03 — FAQ: Revisions

- **Status**: `[EXISTING]`
- **Purpose**: Third accordion item, also shown on the home page.
- **Location**: FAQ page → Accordion item 03; Home page → FAQ preview item 03
- **Current content**:
  > How many revisions are included?
  >
  > The proposal states the revision rounds included at each checkpoint. Revisions inside the agreed scope are part of the process. A change in direction or a new requirement is treated as additional scope, with the cost agreed before work continues.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/faq.ts` (`faqs[2]`)
- **Notes**: The answer intentionally avoids a fixed revision count and defers to the proposal.

### FAQ-04 — FAQ: Source Code Ownership

- **Status**: `[EXISTING]`
- **Purpose**: Fourth accordion item, also shown on the home page.
- **Location**: FAQ page → Accordion item 04; Home page → FAQ preview item 04
- **Current content**:
  > Who owns the source code?
  >
  > Source code for the delivered work transfers to you after final payment, excluding third-party libraries, licensed assets, and any pre-existing tools that remain under their own terms. The handover includes the relevant deployment notes and documentation.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/faq.ts` (`faqs[3]`)
- **Notes**: This is a legal/commercial term. It should match the signed agreement and Terms of Use.

### FAQ-05 — FAQ: Post-Launch Support

- **Status**: `[EXISTING]`
- **Purpose**: Fifth accordion item.
- **Location**: FAQ page → Accordion item 05
- **Current content**:
  > Do you provide post-launch support?
  >
  > Yes. The proposal defines a support window after launch, covering defects in the delivered scope. Ongoing maintenance, new features, and third-party changes are handled as a separate support arrangement so the boundary stays clear.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/faq.ts` (`faqs[4]`)
- **Notes**: No support-window duration or response time is published. Add only if it is a real commitment.

### FAQ-06 — FAQ: NDAs

- **Status**: `[EXISTING]`
- **Purpose**: Sixth accordion item.
- **Location**: FAQ page → Accordion item 06
- **Current content**:
  > Will you sign an NDA?
  >
  > Yes, when a project needs one. We are also comfortable keeping early conversations confidential without a formal agreement. We do not publish client work, names, or details without permission.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/faq.ts` (`faqs[5]`)
- **Notes**: The confidentiality promise is repeated on the Contact page and in the Terms.

### FAQ-07 — FAQ: Small Projects

- **Status**: `[EXISTING]`
- **Purpose**: Seventh accordion item.
- **Location**: FAQ page → Accordion item 07
- **Current content**:
  > Do you take on small projects?
  >
  > Sometimes. A focused website, a single automation, or a well-defined interface problem can be a good fit. The deciding factor is whether the scope is clear enough to deliver properly, not the size of the logo on the invoice.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/faq.ts` (`faqs[6]`)
- **Notes**: The closing phrase is a brand-voice line. Keep if the tone remains dry and direct.

---

## 15. Contact Page & Inquiry Form

### CONTACT-SEO — Contact Page SEO Title & Description

- **Status**: `[EXISTING]`
- **Purpose**: Browser title and search/social description for `/contact`.
- **Location**: Contact page → Metadata
- **Current content**:
  > Title: Contact — ASTRAVA
  > Description: Start a project with ASTRAVA. Tell us what you are trying to build, fix, or improve. Project inquiries are handled directly by the studio.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ContactPage.tsx` (`usePageMeta`)
- **Notes**: The JSON-LD is a `ContactPage` with the studio organisation as `mainEntity`.

### CONTACT-INTRO — Contact Page Intro

- **Status**: `[CONFLICT]`
- **Purpose**: Page heading, introduction, and summary metadata.
- **Location**: Contact page → Page intro
- **Current content**:
  > Eyebrow: [ Contact / Start here ]
  > Title: Tell us what
  > you’re trying to build.
  > Description: A short, honest brief is enough to begin. Share the problem, the constraints, and what a good outcome would look like. We will reply by email with the next useful step.
  > Response: By email
  > Confidential: By default
  > Studio: Remote-first
  > Base: Ahmedabad & Surat
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ContactPage.tsx` (`PageIntro`)
- **Notes**: The title uses a typographic apostrophe in “you’re”. “Base” uses `site.studioLocation`, conflicting with the header/home “Vadodara & Surat”. No response-time commitment is given.

### CONTACT-FORM-HEADER — Inquiry Form Header

- **Status**: `[EXISTING]`
- **Purpose**: Heading above the inquiry form.
- **Location**: Contact page → Form column
- **Current content**:
  > Project inquiry
  > Start with the problem.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/inquiry-form.tsx`
- **Notes**: “Project inquiry” is a small uppercase label; “Start with the problem.” is the display heading.

### CONTACT-FORM-LABELS — Inquiry Form Field Labels

- **Status**: `[EXISTING]`
- **Purpose**: Visible labels for every inquiry field.
- **Location**: Contact page → Inquiry form
- **Current content**:
  > Name *
  > Email address *
  > Contact number *
  > Project type *
  > Brief project description *
  > Approximate budget
  > I consent to being contacted on WhatsApp at the number provided. This is optional.
  > Send inquiry
  > Sending inquiry
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/inquiry-form.tsx`; `src/lib/inquiry-schema.ts`
- **Notes**: Asterisks are required-field markers rendered in accent colour. “Approximate budget” is visibly optional; the WhatsApp checkbox is optional. The submit label switches while submitting.

### CONTACT-FORM-PLACEHOLDERS — Inquiry Form Placeholders

- **Status**: `[EXISTING]`
- **Purpose**: Example or instructional text inside empty fields.
- **Location**: Contact page → Inquiry form
- **Current content**:
  > Your name
  > you@company.com
  > +91 00000 00000
  > Select a project type
  > What are you trying to build, fix, or improve? Include any constraints that matter.
  > Optional — select a range
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/inquiry-form.tsx`
- **Notes**: The phone string is a format hint, not a real number. Do not treat it as a contact detail.

### CONTACT-FORM-PROJECT-TYPES — Inquiry Form Project Type Options

- **Status**: `[EXISTING]`
- **Purpose**: Selectable project categories in the form.
- **Location**: Contact page → Inquiry form → Project type select
- **Current content**:
  > Website Development
  > Custom Software
  > AI-Powered Applications
  > Business Tools & Dashboards
  > Workflow Automation
  > UI/UX & Product Design
  > Other
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/inquiry-schema.ts` (`projectTypes`); `server/index.mjs` (`projectTypes`)
- **Notes**: **Critical:** the list is duplicated in the client schema and the Express server schema. Update both or submissions will be rejected. These values are also used as enum values, so exact casing matters.

### CONTACT-FORM-BUDGETS — Inquiry Form Budget Ranges

- **Status**: `[EXISTING]`
- **Purpose**: Optional budget selector options.
- **Location**: Contact page → Inquiry form → Approximate budget select
- **Current content**:
  > ₹3,000–₹5,000
  > ₹5,000–₹7,000
  > ₹7,000–₹9,000
  > ₹9,000–₹11,000
  > ₹11,000–₹13,000
  > ₹13,000–₹15,000
  > ₹15,000–₹20,000
  > ₹20,000–₹30,000
  > ₹30,000–₹50,000
  > ₹50,000–₹1,00,000
  > Above ₹1,00,000
  > Not sure yet
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/inquiry-schema.ts` (`budgetRanges`); `server/index.mjs` (`budgetRanges`)
- **Notes**: **Critical:** duplicated in client and server. Uses Indian numbering and the rupee symbol; ranges use en dashes. Keep both copies identical.

### CONTACT-FORM-CONSENT — Inquiry Form WhatsApp Consent Copy

- **Status**: `[EXISTING]`
- **Purpose**: Optional consent for WhatsApp follow-up.
- **Location**: Contact page → Inquiry form → Consent checkbox
- **Current content**:
  > I consent to being contacted on WhatsApp at the number provided. This is optional.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/inquiry-form.tsx`; `src/pages/PrivacyPage.tsx`
- **Notes**: No WhatsApp number or link is published. If WhatsApp follow-up is real, supply the business number. If not, remove this consent and the corresponding privacy references.

### CONTACT-FORM-ERRORS — Inquiry Form Validation Messages

- **Status**: `[EXISTING]`
- **Purpose**: Inline error text shown when a field fails validation.
- **Location**: Contact page → Inquiry form → Field errors
- **Current content**:
  > Please enter your name.
  > Please keep your name under 80 characters.
  > Enter a valid email address.
  > Please use an email under 160 characters.
  > Enter a contact number with country code.
  > Please keep the number under 24 characters.
  > Use digits, spaces, brackets, hyphens, or a leading plus sign.
  > Choose a project type.
  > Tell us a little more — at least 20 characters.
  > Please keep the brief under 2,000 characters.
  > Choose a valid budget range.
  > Confirm whether we may contact you on WhatsApp.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/inquiry-schema.ts`; `server/index.mjs` (server-side messages)
- **Notes**: The first ten messages are client-side Zod messages. “Choose a valid budget range.” and “Confirm whether we may contact you on WhatsApp.” are server-side messages. Field limits: name 2–80; email ≤160; phone 7–24; description 20–2,000. Keep the validation copy aligned with those limits.

### CONTACT-FORM-SUBMIT — Inquiry Form Submit Area

- **Status**: `[EXISTING]`
- **Purpose**: Submit button and privacy microcopy.
- **Location**: Contact page → Inquiry form → Footer row
- **Current content**:
  > Send inquiry
  > Sending inquiry
  > Your details are used to respond to this inquiry. Read the privacy notice.
  > Read the FAQ before sending → /faq
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/inquiry-form.tsx`
- **Notes**: The privacy notice phrase links to `/privacy`. “Read the FAQ before sending” is only visible on small screens (`sm:hidden`).

### CONTACT-FORM-SUCCESS — Inquiry Success State

- **Status**: `[EXISTING]`
- **Purpose**: Confirmation shown after the server accepts an inquiry.
- **Location**: Contact page → Inquiry form → Success state
- **Current content**:
  > Inquiry received.
  > Your note is with the studio. We will review the scope and reply by email. If you need to add anything, send it to the same address.
  > Reference / {reference-id}
  > Send another inquiry
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/inquiry-form.tsx`; `server/index.mjs` (reference ID format `AST-{year}-{6 hex characters}`)
- **Notes**: The receipt is shown only after the server responds successfully. The reference ID is dynamic. “Send another inquiry” resets the receipt and form.

### CONTACT-FORM-TOASTS — Inquiry Toast Messages

- **Status**: `[EXISTING]`
- **Purpose**: Transient notifications during submit, success, and failure.
- **Location**: Contact page → Inquiry form → Toast notifications
- **Current content**:
  > Sending inquiry…
  > Inquiry received
  > Reference {reference-id}. We will reply by email.
  > Inquiry not sent
  > The inquiry could not be sent. Please try again or email us directly.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/components/astrava/inquiry-form.tsx` (`toast`)
- **Notes**: The loading state uses an ellipsis character. The failure description may be replaced by the server’s error message when one is returned.

### CONTACT-SIDEBAR-DIRECT — Contact Sidebar: Direct Line

- **Status**: `[EXISTING]`
- **Purpose**: Direct email contact card.
- **Location**: Contact page → Sidebar → Direct line
- **Current content**:
  > Direct line
  > hello@astrava.studio
  > Prefer email? Write to the studio directly. The form is the fastest route for a project inquiry because it captures the details we need to respond properly.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ContactPage.tsx`; `site.email`
- **Notes**: The email is a `mailto:` link. No phone number is shown next to it.

### CONTACT-SIDEBAR-REMOTE — Contact Sidebar: Remote Footprint

- **Status**: `[CONFLICT]`
- **Purpose**: Location and remote-working card.
- **Location**: Contact page → Sidebar → Remote footprint
- **Current content**:
  > Remote footprint
  > Ahmedabad & Surat
  > Tags: Ahmedabad, Surat, Remote-first
  > Conversations, decisions, and scope stay written down so the work can move without relying on a shared room.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ContactPage.tsx`; `site.studioLocation`
- **Notes**: The tags hard-code “Ahmedabad” and “Surat” separately. If the correct base changes to Vadodara, this card must change in three places.

### CONTACT-SIDEBAR-CONFIDENTIAL — Contact Sidebar: Confidentiality

- **Status**: `[EXISTING]`
- **Purpose**: Reassures visitors about inquiry confidentiality.
- **Location**: Contact page → Sidebar → Confidentiality
- **Current content**:
  > Confidentiality
  > Early conversations are treated as confidential. We do not publish client names, project details, or inquiry content without permission. NDAs are available when a project needs one.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ContactPage.tsx`
- **Notes**: Aligns with the FAQ NDA answer and Terms confidentiality section.

### CONTACT-SIDEBAR-NEXT — Contact Sidebar: What Happens Next

- **Status**: `[EXISTING]`
- **Purpose**: Sets the expectation for the inquiry follow-up sequence.
- **Location**: Contact page → Sidebar → What happens next
- **Current content**:
  > What happens next
  > 01 We read the brief and check the fit.
  > 02 If it makes sense, we schedule a discovery call.
  > 03 You receive a written proposal and fixed quotation.
  > Read the full process → /how-we-work
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/ContactPage.tsx`
- **Notes**: Mirrors the first three process steps. Keep the sequence aligned with `/how-we-work`.

### CONTACT-MISSING-PHONE — Contact Page Phone Number

- **Status**: `[MISSING]`
- **Purpose**: A direct phone contact for visitors who prefer voice.
- **Location**: Contact page → Sidebar (no current card)
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No implementation. See `GLOBAL-MISSING-PHONE`.
- **Notes**: Do not publish a number unless it is monitored and approved for public display.

### CONTACT-MISSING-WHATSAPP — Contact Page WhatsApp Contact

- **Status**: `[MISSING]`
- **Purpose**: A real WhatsApp destination for the consent offered in the form.
- **Location**: Contact page → Sidebar (no current card)
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No implementation. See `GLOBAL-MISSING-WHATSAPP`.
- **Notes**: A click-to-chat link requires a verified business number in international format.

### CONTACT-MISSING-SOCIAL — Contact Page Social Profiles

- **Status**: `[MISSING]`
- **Purpose**: Social proof and alternative contact channels.
- **Location**: Contact page → Sidebar (no current card)
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No implementation. See `GLOBAL-MISSING-SOCIAL`.
- **Notes**: Add only verified studio profiles, not personal accounts unless intentionally public.

---

## 16. Privacy Notice

### PRIVACY-SEO — Privacy Page SEO Title & Description

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Browser title and search/social description for `/privacy`.
- **Location**: Privacy Notice → Metadata
- **Current content**:
  > Title: Privacy Notice — ASTRAVA
  > Description: How ASTRAVA handles information submitted through the studio inquiry form, why it is collected, how long it is kept, and how to request access or deletion.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`usePageMeta`)
- **Notes**: The description is accurate to the current notice but should be reviewed with the legal text.

### PRIVACY-INTRO — Privacy Notice Intro & Legal Metadata

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Page heading, description, last-updated date, and legal summary metadata.
- **Location**: Privacy Notice → Page intro
- **Current content**:
  > Eyebrow: [ Legal / Privacy ]
  > Title: Privacy notice
  > Description: What happens to the information you send through this site, in plain language.
  > Last updated: 10 November 2026
  > Applies to: astrava.studio
  > Questions: Email the studio
  > Version: 1.0
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx`; `src/components/astrava/legal-page.tsx`
- **Notes**: The date, domain, and version are hard-coded in the page/component. Update the version and date whenever the notice changes. The domain must match `site.url`.

### PRIVACY-01 — Privacy Section 01: What We Collect

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Explains what inquiry data is collected.
- **Location**: Privacy Notice → Section 01
- **Current content**:
  > What we collect
  >
  > When you submit the project inquiry form, we collect the details you choose to provide: your name, email address, contact number, project type, brief project description, approximate budget if you select one, and your WhatsApp consent choice.
  >
  > The server also processes your IP address in memory to apply rate limits and reduce abuse. It is not written into the inquiry record.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[0]`)
- **Notes**: Matches the form fields. If fields are added or removed, this section must change. The IP handling statement matches the server implementation.

### PRIVACY-02 — Privacy Section 02: Why We Use It

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Explains the purpose and consent basis for inquiry data and WhatsApp follow-up.
- **Location**: Privacy Notice → Section 02
- **Current content**:
  > Why we use it
  >
  > We use inquiry details to read and respond to your message, understand whether the project is a fit, prepare a useful next step, and keep a record of the conversation.
  >
  > If you consent to WhatsApp contact, we may use the number you supplied to follow up about the inquiry. You can withdraw that consent at any time.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[1]`)
- **Notes**: No legal basis is named. Counsel should confirm whether consent, legitimate interest, or contract necessity is the appropriate framing.

### PRIVACY-03 — Privacy Section 03: What We Do Not Do

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: States negative data-use commitments.
- **Location**: Privacy Notice → Section 03
- **Current content**:
  > What we do not do
  >
  > We do not sell your details. We do not use inquiry data for unrelated marketing. We do not add you to a newsletter because you asked about a project.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[2]`)
- **Notes**: Keep these promises only if operations actually comply. A newsletter or CRM integration would require review.

### PRIVACY-04 — Privacy Section 04: Cookies and Analytics

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Discloses the current no-analytics/no-advertising-cookie posture.
- **Location**: Privacy Notice → Section 04
- **Current content**:
  > Cookies and analytics
  >
  > This site does not use advertising cookies or third-party analytics scripts. If that changes, this notice will be updated before the change goes live.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[3]`)
- **Notes**: Changing analytics requires updating this section and likely adding a consent mechanism. See GAP-20.

### PRIVACY-05 — Privacy Section 05: Sharing and Service Providers

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Describes third-party processors and legal disclosures.
- **Location**: Privacy Notice → Section 05
- **Current content**:
  > Sharing and service providers
  >
  > We may use service providers for hosting, email delivery, and infrastructure. Those providers process data on our behalf and only for the service they provide.
  >
  > We may disclose information if required by law, or if necessary to protect the studio, a client, or another person from harm.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[4]`)
- **Notes**: No named processors are listed. Depending on jurisdiction, a list of categories or names may be required.

### PRIVACY-06 — Privacy Section 06: How Long We Keep It

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Describes retention.
- **Location**: Privacy Notice → Section 06
- **Current content**:
  > How long we keep it
  >
  > We keep inquiry records only as long as needed to respond, evaluate the project, and maintain reasonable business records. If you ask us to delete an inquiry and there is no legal or contractual reason to keep it, we will do so.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[5]`)
- **Notes**: No specific retention period is stated. Counsel should decide whether a fixed period (for example, 12 or 24 months) is required.

### PRIVACY-07 — Privacy Section 07: How We Protect It

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Describes technical and organisational safeguards.
- **Location**: Privacy Notice → Section 07
- **Current content**:
  > How we protect it
  >
  > The inquiry endpoint validates submissions, applies rate limiting, and is served over HTTPS in production. Access to stored inquiries is limited to the studio.
  >
  > No system is perfectly secure. Please do not send passwords, private keys, or sensitive personal data in the inquiry form.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[6]`)
- **Notes**: The HTTPS claim depends on deployment. Confirm TLS is enforced before launch. Stored inquiries are kept as JSONL on the server.

### PRIVACY-08 — Privacy Section 08: Your Choices

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Explains access, correction, deletion, and consent withdrawal.
- **Location**: Privacy Notice → Section 08
- **Current content**:
  > Your choices
  >
  > You can ask us to access, correct, or delete the inquiry information we hold about you. You can also withdraw WhatsApp consent. Write to the studio email below and we will respond.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[7]`)
- **Notes**: No response deadline is stated. Depending on jurisdiction, a statutory response window may apply.

### PRIVACY-09 — Privacy Section 09: Contact

- **Status**: `[CONFLICT]` / `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Contact details for privacy questions.
- **Location**: Privacy Notice → Section 09
- **Current content**:
  > Contact
  >
  > Questions about this notice can be sent to hello@astrava.studio. The studio is remote-first, with roots in Ahmedabad & Surat.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx` (`sections[8]`); uses `site.email` and `site.studioLocation`
- **Notes**: The location is injected from `site.studioLocation` and conflicts with “Vadodara & Surat” elsewhere. No grievance officer or postal address is provided.

### LEGAL-MISSING-ENTITY — Legal Entity Name & Registered Address

- **Status**: `[MISSING]` / `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Identifies the legal person behind “ASTRAVA” in the Privacy Notice and Terms.
- **Location**: Privacy Notice; Terms of Use
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No legal entity data exists in the codebase.
- **Notes**: Supply the registered legal name, entity type, registered address, and country. Do not invent a company or address.

### LEGAL-MISSING-REGISTRATION — Business Registration / Tax Identifiers

- **Status**: `[MISSING]` / `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Standard Indian business identifiers for invoices, terms, and legal pages.
- **Location**: Terms of Use; Privacy Notice; invoices (not on site)
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No GSTIN, CIN, LLPIN, PAN, or MSME registration is present.
- **Notes**: Publish only if legally required or commercially appropriate. Verify every identifier before publishing.

### LEGAL-MISSING-REFUND — Refund / Cancellation / Termination Policy

- **Status**: `[MISSING]` / `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Explains what happens if a project is cancelled, paused, or refunded.
- **Location**: Terms of Use; FAQ
- **Current content**:
  > Not currently implemented
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: No refund or cancellation section exists in `src/pages/TermsPage.tsx` or `src/data/faq.ts`.
- **Notes**: The FAQ mentions milestone payments and an advance but not cancellation. Counsel should define notice periods, kill fees, and refund treatment.

### LEGAL-MISSING-GRIEVANCE — Grievance Officer / Data Protection Contact

- **Status**: `[MISSING]` / `[LEGAL REVIEW REQUIRED]`
- **Purpose**: A named contact for privacy complaints and statutory grievances.
- **Location**: Privacy Notice
- **Current content**:
  > Not currently implemented. Only the general studio email is provided.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx`
- **Notes**: Depending on applicable Indian rules, a grievance officer name, designation, email, and address may be required. Confirm with counsel.

### LEGAL-REVIEW-PRIVACY — Privacy Notice Legal Review

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Tracks that the entire Privacy Notice requires professional review.
- **Location**: Privacy Notice → Entire page
- **Current content**:
  > Entire notice dated 10 November 2026, version 1.0.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/PrivacyPage.tsx`
- **Notes**: Review retention, lawful basis, processor list, international transfers, grievance mechanism, and the WhatsApp consent flow.

---

## 17. Terms of Use

### TERMS-SEO — Terms Page SEO Title & Description

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Browser title and search/social description for `/terms`.
- **Location**: Terms of Use → Metadata
- **Current content**:
  > Title: Terms — ASTRAVA
  > Description: Terms for using the ASTRAVA website, including project engagements, quotations, intellectual property, confidentiality, and liability.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`usePageMeta`)
- **Notes**: The description should be reviewed with the legal text.

### TERMS-INTRO — Terms of Use Intro & Legal Metadata

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Page heading, description, last-updated date, and legal summary metadata.
- **Location**: Terms of Use → Page intro
- **Current content**:
  > Eyebrow: [ Legal / Terms ]
  > Title: Terms of use
  > Description: The ground rules for using this site and engaging the studio.
  > Last updated: 10 November 2026
  > Applies to: astrava.studio
  > Questions: Email the studio
  > Version: 1.0
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx`; `src/components/astrava/legal-page.tsx`
- **Notes**: The date, domain, and version are hard-coded. Update the version and date whenever the terms change.

### TERMS-01 — Terms Section 01: Use of This Site

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Basic acceptable-use terms.
- **Location**: Terms of Use → Section 01
- **Current content**:
  > Use of this site
  >
  > This website is operated by ASTRAVA. By using it, you agree to use it lawfully and not to interfere with its operation, security, or availability.
  >
  > The site may change, be unavailable temporarily, or be withdrawn without notice.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[0]`)
- **Notes**: “ASTRAVA” is not identified as a legal entity here. See `LEGAL-MISSING-ENTITY`.

### TERMS-02 — Terms Section 02: Information on the Site

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Disclaimer about website content.
- **Location**: Terms of Use → Section 02
- **Current content**:
  > Information on the site
  >
  > The content on this site describes the studio, its services, and its work. It is provided for general information. It is not a substitute for a written project proposal or professional advice for your specific situation.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[1]`)
- **Notes**: Keep the distinction between marketing content, proposals, and professional advice.

### TERMS-03 — Terms Section 03: Project Engagements

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Defines when a client relationship begins.
- **Location**: Terms of Use → Section 03
- **Current content**:
  > Project engagements
  >
  > A project only begins when both sides sign a written proposal or agreement. Submitting an inquiry, receiving a quotation, or discussing scope does not create a client relationship on its own.
  >
  > The written agreement controls the scope, timeline, fees, revisions, ownership, confidentiality, and support terms for that project.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[2]`)
- **Notes**: This is a key commercial clause. Ensure the studio actually uses signed written agreements for every engagement.

### TERMS-04 — Terms Section 04: Quotations and Payment

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Describes quotation validity, scope changes, and payment terms.
- **Location**: Terms of Use → Section 04
- **Current content**:
  > Quotations and payment
  >
  > Quotations are based on the scope and assumptions stated in the proposal. They are valid for the period written in the quotation. Work outside the agreed scope is quoted separately before it starts.
  >
  > Milestone payments, taxes, and payment timelines are set out in the project agreement.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[3]`)
- **Notes**: No default quotation validity period is published. The FAQ says the advance is typically 15–20%; the agreement controls the actual terms.

### TERMS-05 — Terms Section 05: Client Responsibilities

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Defines client obligations and the effect of delays.
- **Location**: Terms of Use → Section 05
- **Current content**:
  > Client responsibilities
  >
  > A good outcome depends on both sides. Clients are responsible for providing timely feedback, access, content, approvals, and the information needed to complete the agreed work.
  >
  > Delays caused by missing input or approvals may affect the timeline and are handled under the project agreement.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[4]`)
- **Notes**: Keep this aligned with the revision and checkpoint process.

### TERMS-06 — Terms Section 06: Intellectual Property

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Covers ownership of the site and delivered client work.
- **Location**: Terms of Use → Section 06
- **Current content**:
  > Intellectual property
  >
  > The content, design, and code of this website belong to ASTRAVA unless stated otherwise. You may not copy or reuse them without permission.
  >
  > For client projects, ownership of delivered work transfers according to the signed agreement, usually after final payment. Third-party libraries, licensed assets, and pre-existing tools remain under their own terms.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[5]`)
- **Notes**: This should match the FAQ source-code ownership answer and the actual project agreement.

### TERMS-07 — Terms Section 07: Confidentiality

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Mutual confidentiality expectations.
- **Location**: Terms of Use → Section 07
- **Current content**:
  > Confidentiality
  >
  > Both sides should protect confidential information shared during an engagement. We do not publish client names, project details, or inquiry content without permission.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[6]`)
- **Notes**: “Should protect” is softer than a binding confidentiality obligation. Counsel should decide whether stronger language is needed.

### TERMS-08 — Terms Section 08: Limitation of Liability

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Limits liability for website use and engagements.
- **Location**: Terms of Use → Section 08
- **Current content**:
  > Limitation of liability
  >
  > To the extent permitted by law, ASTRAVA is not liable for indirect, incidental, or consequential loss arising from use of this website or a project engagement. Liability under a project agreement is limited to the terms of that agreement.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[7]`)
- **Notes**: High-risk legal clause. Requires counsel review and consistency with the project agreement.

### TERMS-09 — Terms Section 09: Third-Party Links

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Disclaims responsibility for external sites.
- **Location**: Terms of Use → Section 09
- **Current content**:
  > Third-party links
  >
  > This site may link to external websites or repositories. Those sites are not controlled by ASTRAVA, and their own terms and privacy practices apply.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[8]`)
- **Notes**: Relevant to the GitHub and PyPI links in the work projects.

### TERMS-10 — Terms Section 10: Governing Law

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Sets governing law and jurisdiction.
- **Location**: Terms of Use → Section 10
- **Current content**:
  > Governing law
  >
  > These terms are governed by the laws of India. Any dispute is subject to the jurisdiction of the courts of India, unless a signed project agreement says otherwise.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[9]`)
- **Notes**: “Courts of India” is broad. Counsel may prefer a specific city or state jurisdiction.

### TERMS-11 — Terms Section 11: Changes to These Terms

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Explains how terms are updated.
- **Location**: Terms of Use → Section 11
- **Current content**:
  > Changes to these terms
  >
  > We may update these terms as the studio or the site changes. The date at the top of the page shows the latest version.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[10]`)
- **Notes**: No notification mechanism is described. Consider whether material changes require notice.

### TERMS-12 — Terms Section 12: Contact

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Contact details for questions about the terms.
- **Location**: Terms of Use → Section 12
- **Current content**:
  > Contact
  >
  > Questions about these terms can be sent to hello@astrava.studio.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx` (`sections[11]`); `site.email`
- **Notes**: No postal address or legal entity name is provided. See `LEGAL-MISSING-ENTITY`.

### LEGAL-REVIEW-TERMS — Terms of Use Legal Review

- **Status**: `[LEGAL REVIEW REQUIRED]`
- **Purpose**: Tracks that the entire Terms of Use requires professional review.
- **Location**: Terms of Use → Entire page
- **Current content**:
  > Entire terms dated 10 November 2026, version 1.0.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/TermsPage.tsx`
- **Notes**: Review entity identification, governing law, liability cap, IP transfer, payment defaults, cancellation, and privacy cross-references.

---

## 18. 404 Page

### NOTFOUND-SEO — 404 Page SEO Title & Description

- **Status**: `[EXISTING]`
- **Purpose**: Browser title and description for unmatched routes.
- **Location**: 404 page → Metadata
- **Current content**:
  > Title: Page not found — ASTRAVA
  > Description: This page could not be found. Return to ASTRAVA or start a project inquiry.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/NotFoundPage.tsx` (`usePageMeta`)
- **Notes**: The canonical path is `/404`, which is not an actual route. The page is rendered for any unmatched path and for missing project slugs.

### NOTFOUND-CONTENT — 404 Page Copy

- **Status**: `[EXISTING]`
- **Purpose**: Heading and explanation for lost visitors.
- **Location**: 404 page → Main content
- **Current content**:
  > Eyebrow: [ 404 / Off the map ]
  > Title: This page
  > is off the map.
  > Paragraph: The address may have changed, or the page may never have existed. The useful routes are still here.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/NotFoundPage.tsx`
- **Notes**: The title is forced onto two lines. A large decorative Astra mark sits to the right on desktop.

### NOTFOUND-BUTTONS — 404 Page Actions

- **Status**: `[EXISTING]`
- **Purpose**: Recovery links from the 404 page.
- **Location**: 404 page → Button row
- **Current content**:
  > Back to the studio → /
  > Explore the work → /work
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/NotFoundPage.tsx` (`ActionLink`)
- **Notes**: “Back to the studio” is the primary action; “Explore the work” is outline.

---

## 19. Technical, Routing & Integration Reference

> These values are not marketing copy. They are documented so future editors understand dependencies and do not break routes, validation, or publishing. Do not edit them as if they were prose.

### TECH-ROUTES — Application Routes

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Defines the public URL structure.
- **Location**: Global → Router
- **Current content**:
  > `/` → Home
  > `/work` → Work index
  > `/work/:slug` → Work detail
  > `/services` → Services
  > `/about` → About
  > `/how-we-work` → Process
  > `/faq` → FAQ
  > `/contact` → Contact
  > `/privacy` → Privacy Notice
  > `/terms` → Terms of Use
  > `*` → 404
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/App.tsx` (`Routes`); `src/main.tsx` (`BrowserRouter`)
- **Notes**: The production server serves `dist/index.html` for non-API GET requests, enabling client-side routing. Changing a path requires updating the sitemap, internal links, structured data, and any redirects.

### TECH-INQUIRY-API — Inquiry API Endpoint

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Receives and stores project inquiries.
- **Location**: Contact page → Form submit → Server
- **Current content**:
  > `POST /api/inquiries`
  > `GET /api/health` → `{ ok: true, service: "astrava-inquiry-api" }`
  > Success: `201 { ok: true, id }`
  > Duplicate within 10 minutes: `200 { ok: true, id, duplicate: true }`
  > Honeypot submission: `200 { ok: true, id: "received" }`
  > Rate limit: 8 requests per 15 minutes per IP (100 in test mode; override with `RATE_LIMIT_MAX`)
  > Reference ID format: `AST-{year}-{6 uppercase hex characters}`
  > Storage: `server/data/inquiries.jsonl` (JSON Lines)
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `server/index.mjs`
- **Notes**: The client calls a relative `/api/inquiries` endpoint. The server validates with Zod, applies rate limiting, rejects honeypot submissions, and optionally forwards accepted records to `INQUIRY_WEBHOOK_URL`.

### TECH-INQUIRY-MESSAGES — Inquiry API Error Messages

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Server-generated messages shown when validation or transport fails.
- **Location**: Inquiry API → Responses
- **Current content**:
  > Too many inquiries from this address. Please wait a few minutes and try again.
  > The request body is not valid JSON.
  > The inquiry could not be saved.
  > API route not found.
  >
  > Field validation (first invalid field):
  > Please enter your name.
  > Enter a valid email address.
  > Enter a contact number with country code.
  > Choose a project type.
  > Tell us a little more about the project.
  > Choose a valid budget range.
  > Confirm whether we may contact you on WhatsApp.
  > Please check the form fields and try again.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `server/index.mjs`
- **Notes**: The client may display these messages in the form error box or toast. Keep them consistent with the validation copy.

### TECH-ENV — Environment Variables

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Deployment configuration.
- **Location**: Root → `.env` / hosting environment
- **Current content**:
  > `PORT=8787`
  > `TRUST_PROXY=false`
  > `VITE_STUDIO_EMAIL=hello@astrava.studio`
  > `VITE_SITE_URL=https://astrava.studio`
  > `INQUIRY_WEBHOOK_URL=`
  >
  > Server-supported but not listed in `.env.example`:
  > `NODE_ENV` — `production` enables static file serving; `test` raises the inquiry rate limit to 100.
  > `RATE_LIMIT_MAX` — optional numeric override for the per-IP inquiry limit (default 8).
  > `--production` CLI flag — alternative to `NODE_ENV=production`.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `.env.example`; `src/lib/site.ts`; `server/index.mjs`
- **Notes**: `VITE_*` variables are exposed to the client at build time. `INQUIRY_WEBHOOK_URL` is server-only. Never commit real secrets.

### TECH-SITEMAP — XML Sitemap

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Search-engine URL inventory.
- **Location**: Public assets → `/sitemap.xml`
- **Current content**:
  > Home, Work, five work detail pages, Services, About, How We Work, FAQ, Contact, Privacy, Terms.
  > All `lastmod` values: `2026-11-10`.
  > Priorities range from `1.0` (home) to `0.3` (Privacy/Terms).
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `public/sitemap.xml`
- **Notes**: The sitemap is manually maintained. Add or remove URLs when projects or routes change. Update `lastmod` when content changes materially.

### TECH-ROBOTS — Robots File

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Crawl directives.
- **Location**: Public assets → `/robots.txt`
- **Current content**:
  > User-agent: *
  > Allow: /
  > Disallow: /api/
  >
  > Sitemap: https://astrava.studio/sitemap.xml
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `public/robots.txt`
- **Notes**: The API is excluded from crawling. The sitemap URL must match `site.url`.

### TECH-ASSETS — Brand & Social Assets

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Favicon and social image assets.
- **Location**: Public assets
- **Current content**:
  > `public/favicon.svg` — Astra mark favicon
  > `public/og-image.png` — 1200 × 630 social card
  > Inline SVG Astra mark component used throughout the site
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `public/favicon.svg`; `public/og-image.png`; `src/components/astrava/astra-mark.tsx`; `index.html`
- **Notes**: There are no raster project screenshots in the public assets. All project visuals are code-drawn SVG glyphs.

### TECH-JSONLD — Structured Data Types

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Schema.org markup per page.
- **Location**: Global / Home / Work / Services / About / Process / FAQ / Contact
- **Current content**:
  > Home: `ProfessionalService`
  > Work index: `CollectionPage` + `ItemList`
  > Work detail: `CreativeWork`
  > Services: `OfferCatalog`
  > About: `AboutPage` + `Organization`
  > How We Work: `HowTo` + seven `HowToStep`
  > FAQ: `FAQPage`
  > Contact: `ContactPage` + `Organization`
  > Global: `Organization` + `WebSite`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/lib/seo.ts`; page-level `usePageMeta`; `index.html`
- **Notes**: Structured data contains the conflicting “Ahmedabad & Surat” locality in the Home and static `index.html` JSON-LD. It does not include project links; the personal GitHub URLs are confined to visible project links. Review before changing location or organisation data.

### TECH-OG-META — Static HTML Metadata

- **Status**: `[TECHNICAL VALUE — DO NOT EDIT AS COPY]`
- **Purpose**: Baseline metadata available before client-side React runs.
- **Location**: `index.html`
- **Current content**:
  > `lang="en"`
  > `theme-color`: `#0E0E10`
  > `color-scheme`: `dark`
  > `robots`: `index,follow`
  > `author`: `ASTRAVA`
  > Canonical: `https://astrava.studio/`
  > Open Graph: type `website`, site name `ASTRAVA`, locale `en_IN`, image 1200 × 630
  > Twitter card: `summary_large_image`
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `index.html`
- **Notes**: Client-side `usePageMeta` overwrites title, description, canonical, and social metadata on route changes. Keep the static tags consistent with the dynamic defaults.

---

## 20. Conflict Register

> Resolve these before making individual copy edits. Each conflict affects multiple fields, and partial fixes will leave the site inconsistent.

### CONFLICT-01 — Studio Location

- **Status**: `[CONFLICT]`
- **Purpose**: Documents every occurrence of the two competing studio locations.
- **Location**: Multiple pages / structured data
- **Current content**:
  > **“Vadodara & Surat” appears in:**
  > - `src/lib/site.ts` — `heroLocation`
  > - Header desktop status line
  > - Header mobile sheet status line
  > - Home page studio-signal card (“Base”)
  > - Home page metric label (“Founding Builders (Vadodara & Surat)”)
  >
  > **“Ahmedabad & Surat” appears in:**
  > - `src/lib/site.ts` — `studioLocation`
  > - Header mobile sheet “Remote-first” panel
  > - Home page JSON-LD `addressLocality`
  > - `index.html` JSON-LD `addressLocality`
  > - About page SEO description (“Ahmedabad and Surat”)
  > - About page intro meta (“Base”)
  > - About page body copy (“Ahmedabad and Surat”)
  > - About page remote-first section (“Ahmedabad and Surat”)
  > - Contact page intro meta (“Base”)
  > - Contact page remote-footprint card and tags
  > - Footer status line
  > - Privacy Notice contact section
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: See the individual fields above.
- **Notes**: Confirm the correct city pair first. Then centralise the approved wording in `site.ts` and remove hard-coded duplicates from components and legal copy. Also fix the JSON-LD `addressLocality` shape; a single locality cannot contain two cities joined by an ampersand.

### CONFLICT-02 — Palette Description vs Actual Palette

- **Status**: `[CONFLICT]`
- **Purpose**: Documents a factual mismatch between case-study copy and the shipped design.
- **Location**: Work detail → ASTRAVA Studio Site → Approach
- **Current content**:
  > “Use charcoal, warm white, and electric blue as a single coherent palette.”
  >
  > The actual codebase uses charcoal (`#0A0A0C` / `#0E0E10`), warm white (`#FAF9F6`), and a terracotta/orange accent (`#E05A3E`). No electric blue is used.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[4].approach[0]`); `src/index.css`; component accent classes
- **Notes**: Either update the copy to “terracotta” or change the design. Do not describe a palette the site does not use.

### CONFLICT-03 — Performance Claims vs “No Performance Claims” Policy

- **Status**: `[CONFLICT]` / `[NEEDS CONFIRMATION]`
- **Purpose**: Documents the contradiction between the home-page metrics and the studio-site case study.
- **Location**: Home page → Metrics strip; Work detail → ASTRAVA Studio Site → Limitations
- **Current content**:
  > Home: “Deterministic Systems — 100%” and “Target Latency & Zero Slop — < 100ms”.
  >
  > Studio-site case study limitation: “Performance claims are intentionally absent until they can be measured.”
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx`; `src/data/work.ts` (`workProjects[4].limitations[1]`)
- **Notes**: Decide whether the home metrics are brand positioning or measured results. If they are measured, publish the methodology. If not, remove or qualify them.

### CONFLICT-04 — Self-Referential Project Count

- **Status**: `[CONFLICT]` / `[NEEDS CONFIRMATION]`
- **Purpose**: Documents copy that will become false as the work index grows.
- **Location**: Home/work project 05 summary; Work page metadata
- **Current content**:
  > Work project 05 summary: “The studio's own site: a considered editorial system, five real projects, and a server-validated lead capture flow.”
  > Work page metadata: “Projects: 05”
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/data/work.ts` (`workProjects[4].summary`); `src/pages/WorkPage.tsx` (`PageIntro meta`)
- **Notes**: Hard-coded counts go stale. Prefer dynamic values or remove the count from prose. Update both when a sixth project is published.

### CONFLICT-05 — “No Invented Metrics” vs Published Metrics

- **Status**: `[CONFLICT]` / `[NEEDS CONFIRMATION]`
- **Purpose**: Documents the tension between the brand’s anti-fabrication stance and its quantified claims.
- **Location**: Home page → Philosophy card 03; Work project 05 → Approach; Home page → Metrics strip
- **Current content**:
  > Philosophy: “No invented clients, fake metrics, or decorative testimonials.”
  > Project 05 approach: “No invented clients, awards, testimonials, or performance claims.”
  > Home metrics: “100%” and “< 100ms”.
- **New content**:
  > [WRITE YOUR REPLACEMENT HERE]
- **Implementation reference**: `src/pages/HomePage.tsx`; `src/data/work.ts` (`workProjects[4].approach[1]`)
- **Notes**: This is the same underlying issue as CONFLICT-03. Resolve it once and apply consistently across the home page, Work page, and About page.

