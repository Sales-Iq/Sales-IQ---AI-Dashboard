# SalesIQ Design System & Motion Specification
*Synthesized using Google Stitch Semantic Design Standards (`taste-design`)*

---

## 1. Visual Atmosphere & Philosophy

- **Vibe Classification**: High-Precision Executive Intelligence with Tactical Glassmorphism
- **Density**: 6 / 10 (*Daily App Balanced*) — high data density with clear spatial separation
- **Variance**: 5 / 10 (*Controlled Asymmetric*) — clean multi-column dashboard grid with dynamic tile heights
- **Motion**: 7 / 10 (*Framer Spring Physics*) — hardware-composited analytical springs, staggered waterfalls, zero linear easing
- **Base Atmosphere**: Obsidian dark slate (`#020617` / `#0f172a`) paired with Kerfa-inspired frosted liquid glass (`rgba(20, 29, 44, 0.62)` at `24px` backdrop blur) and electric royal blue accents.

---

## 2. Calibrated Color Palette

| Role | Descriptive Name | Hex / RGBA Code | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Accent** | Electric Royal Blue | `#3b82f6` (Dark) / `#2563eb` (Light) | CTAs, active indicators, primary chart lines, focus rings |
| **Secondary Accent** | Sky Sapphire | `#60a5fa` | Secondary highlights, hover glows, metric badges |
| **Base Surface (Dark)**| Obsidian Slate-950 | `#020617` / `#0b121c` | App canvas background, root container |
| **Frosted Glass (Dark)**| Translucent Kerfa Glass| `rgba(20, 29, 44, 0.62)` | Cards, charts, sidebar, modals, panels |
| **Border / Glass Lip** | Liquid White Specular | `rgba(255, 255, 255, 0.18)` | Inset top specular edge highlight (`1px`) |
| **Subtle Border** | Deep Sapphire Border | `rgba(59, 130, 246, 0.20)` | Outer card edge definition |
| **Status: Success** | Emerald Mint | `#10b981` | Positive trends, stock available, completed sales |
| **Status: Warning** | Solar Amber | `#f59e0b` | Low stock, pending confirmations |
| **Status: Danger** | Crimson Flame | `#ef4444` | Out of stock, cancellations, alerts |

### Color Rules & Banned Patterns
- **No Neon Purple/Magenta Clichés**: Strictly banned. No AI purple gradients or magenta glows.
- **Singular Dominant Accent**: Royal blue is the sole primary accent. Secondary colors are semantic-only (green/amber/red).
- **No Flat Pure Black**: Never use `#000000`. Base is calibrated Slate-950 (`#020617`).

---

## 3. Typographic Architecture

- **Primary Typeface**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif
- **Financial & Data Monospace**: Tabular numeric figures (`font-variant-numeric: tabular-nums`)
- **Hierarchy Scale**:
  - `Display / Page Title`: `1.5rem` (`24px`), `font-weight: 800`, track-tight (`-0.025em`)
  - `Card Header / Section`: `1.125rem` (`18px`), `font-weight: 700`, leading snug
  - `Stat Values`: `1.75rem` (`28px`), `font-weight: 800`, tabular-nums, track-tight
  - `Body / Descriptions`: `0.875rem` (`14px`), `font-weight: 500`, relaxed leading
  - `Microcopy / Hints`: `0.75rem` (`12px`), `font-weight: 600`, opacity `0.75`

---

## 4. Framer Motion & Spring Physics Architecture

All animations run exclusively on the GPU compositor thread using `transform` and `opacity`. No layout thrashing (`width`, `height`, `top`, `left` are never animated during micro-interactions).

### Analytical Spring Presets

$$\text{Equation: } m x'' + c x' + k x = 0$$

1. **`snappy` (Buttons, Pills, Toggles, Micro-Interactions)**:
   - Parameters: `stiffness: 420, damping: 32, mass: 1`
   - CSS Easing: `linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.548 18.9%, 0.742 26.1%, 0.884 34.4%, 0.963 43.3%, 0.999 53.3%, 1.011 63.9%, 1.008 75.6%, 1)`
   - Duration: `~300ms`
2. **`gentle` (Cards, Panels, Page Transitions)**:
   - Parameters: `stiffness: 280, damping: 26, mass: 1`
   - CSS Easing: `linear(0, 0.009, 0.035 2.1%, 0.141 4.7%, 0.723 16%, 0.938 23.8%, 1.008 30%, 1.024 37.2%, 1.012 46.2%, 1)`
   - Duration: `~450ms`
3. **`bouncy` (Modals, Alerts, Notification Pops, Badges)**:
   - Parameters: `stiffness: 350, damping: 20, mass: 1`
   - CSS Easing: `linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.548 18.9%, 0.742 26.1%, 0.884 34.4%, 0.963 43.3%, 1.03 54.3%, 1.05 64.9%, 1.01 77.6%, 1)`
   - Duration: `~550ms`

### Motion Specifications & Micro-Interactions

| Interaction | Framer Mechanism | Parameters |
| :--- | :--- | :--- |
| **Card Ingress Waterfall** | `staggerIn` | `stagger: 40ms`, `yOffset: 16px`, `scale: 0.97 -> 1.0`, preset `gentle` |
| **Spring Press Feedback** | `springPress` | `scale: 0.95` on `pointerdown`, spring rebound on release |
| **Sliding Tab Pill** | `framer-sliding-pill` (layoutId) | `transform 0.35s var(--spring-snappy)`, `width 0.28s var(--spring-snappy)` |
| **Number Roll-Up** | `springTicker` | Velocity deceleration ticker with spring solver over `900ms` |
| **Modal Spring Pop** | `framerModalPop` | `scale: 0.92 -> 1.0`, `translateY: 16px -> 0`, preset `bouncy` |
| **Live Pulse Indicator** | `framerPulseBreath` | Damped scale oscillation `1.0 -> 1.6` with fade over `2.4s` |
| **Tactile Click Ripple** | `liquidClickRipple` | Center-expanding radial wave `0.45s` on `pointerdown` |

---

## 5. Component Specifications

### Stat Cards (`.stat-card`)
- **Surface**: Dual gradient translucent frosted glass (`backdrop-filter: blur(24px)`).
- **Specular Lip**: `inset 0 1px 0 rgba(255, 255, 255, 0.18)`.
- **Hover Reaction**: Ambient shadow elevation `0 24px 55px -12px rgba(0,0,0,0.55)` with subtle royal blue edge bloom (`0 0 28px rgba(59, 130, 246, 0.15)`).

### Buttons (`.btn`, `.btn-primary`)
- **Idle**: Royal blue gradient (`linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)`).
- **Active State**: Tactile spring compression (`scale: 0.95`) combined with dynamic water ripple.
- **Cursor Tracking**: None. Cursor tracking is banned; interactions are purely tactile and gestural.

### Modals & Dialogs (`.modal-box`, `.modal-card`)
- **Backdrop**: Deep obsidian frosted glass overlay (`backdrop-filter: blur(16px)`).
- **Ingress**: Organic spring scale-up (`scale(0.92)` to `scale(1)`) with zero layout jump.

### Mobile Bottom-Sheet (`.mobile-sheet`)
- **Surface**: Ultra-dense frosted glass (`backdrop-filter: blur(32px) saturate(1.5)`), `rgba(20, 29, 44, 0.96)`.
- **Top Lip**: High-specular specular rim `inset 0 1px 0 rgba(255, 255, 255, 0.25)`.
- **Border Radius**: `28px 28px 0 0` docked to the bottom.
- **Drag Pill**: `44px × 5px` rounded handle with active expansion feedback.
- **Touch Gestures**:
  - Drag downward past `90px` or downward velocity $> 0.45\text{ px/ms}$ to dismiss.
  - Upward rubber-band drag resistance ($\Delta y / 3.5$).
  - Elastic rebound spring on release before threshold.
  - Background scroll lock and backdrop tap to dismiss.

### Mobile Quick Dock (`.mobile-quick-dock`)
- **Floating Pill Dock**: Fixed at bottom center (`bottom: max(14px, env(safe-area-inset-bottom))`).
- **Surface**: Translucent frosted slate pill (`rgba(15, 23, 42, 0.88)` at `24px` blur).
- **Actions**: Instant access to Record Sale (`➕`), Chart Sheet Inspection (`📊`), and Scroll to Top (`⬆`).

---

## 6. Accessibility & Reduced Motion
When `prefers-reduced-motion: reduce` is enabled:
- All spring physics and staggered delays collapse to instant visual states.
- Transforms and continuous pulsing loops are completely suppressed.
- High-contrast text and border geometry are strictly preserved.
