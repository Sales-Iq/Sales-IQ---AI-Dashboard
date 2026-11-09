/**
 * SalesIQ Liquid Glass Click & Framer Interaction Orchestrator
 * Cursor-following effects removed per user request.
 * Pure tactile click feedback, ripple effects, and Framer spring physics enabled.
 */
(function () {
  "use strict";

  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Universal Liquid Click Ripple Feedback ────────────────────────────────
  function createClickRipple(event) {
    if (reduced) return;

    // Only respond to primary click (left mouse button or tap)
    if (event.button !== undefined && event.button !== 0) return;

    // Target clickable / interactive elements
    const target = event.target?.closest?.(
      ".btn, button, .nav-link, .tile-action-btn, .timeframe-tab, .chart-icon-btn, .chip, .tab-btn, .clickable-card"
    );
    if (!target) return;

    // Ensure target has positioning and overflow clipping for ripple
    const computed = window.getComputedStyle(target);
    if (computed.position === "static") {
      target.style.position = "relative";
    }
    target.style.overflow = "hidden";

    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const diameter = Math.max(rect.width, rect.height) * 2.2;

    const ripple = document.createElement("span");
    ripple.className = "liquid-click-ripple";
    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);

    ripple.addEventListener(
      "animationend",
      () => {
        ripple.remove();
      },
      { once: true },
    );

    // Failsafe cleanup in case animationend didn't fire
    setTimeout(() => {
      if (ripple.parentNode) ripple.remove();
    }, 550);
  }

  // Listen globally for click / pointerdown
  document.addEventListener("pointerdown", createClickRipple, { passive: true });

  // ── Framer Spring Motion Orchestrator ─────────────────────────────────────
  function initFramerOrchestrator() {
    if (!window.FramerMotion || reduced) return;

    const FM = window.FramerMotion;

    // 1. Initial Page Load Ingress: Cascade stat cards and chart boxes
    function orchestrateIngress() {
      // Stagger stat cards in grid
      const statsGrid = document.querySelector(".stats-grid, #adminStats, .stats-row");
      if (statsGrid) {
        FM.staggerIn(statsGrid, ".stat-card", {
          stagger: 45,
          yOffset: 16,
          initialScale: 0.97,
          preset: "gentle",
        });
      }

      // Stagger dashboard charts & tiles
      const dashboardCols = document.querySelector("#dashboardColumns, .dashboard-columns-layout");
      if (dashboardCols) {
        FM.staggerIn(dashboardCols, ".chart-box, .dashboard-tile", {
          stagger: 60,
          yOffset: 20,
          initialScale: 0.98,
          preset: "gentle",
          baseDelay: 80,
        });
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", orchestrateIngress);
    } else {
      orchestrateIngress();
    }

    // 2. Observe dynamic changes (e.g. when Firestore renders stats or tables)
    let debounceTimer = null;
    const observer = new MutationObserver((mutations) => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        for (const m of mutations) {
          if (m.type === "childList" && m.addedNodes.length > 0) {
            for (const node of m.addedNodes) {
              if (node.nodeType === 1) {
                // If new stat cards are rendered
                if (node.matches?.(".stat-card") || node.querySelector?.(".stat-card")) {
                  const targetParent = node.matches?.(".stat-card") ? node.parentElement : node;
                  FM.staggerIn(targetParent, ".stat-card", { stagger: 40, preset: "gentle" });
                }
                // If a modal or banner opened
                if (node.matches?.(".modal, .modal-backdrop, [role='dialog'], #dashboardEditBanner") && !node.classList.contains("hidden")) {
                  FM.springModalOpen(node);
                }
              }
            }
          }
        }
      }, 50);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Load MobileBottomSheet if not yet loaded
  if (!window.MobileBottomSheet) {
    const sheetScript = document.createElement("script");
    sheetScript.src = "/js/mobile-bottom-sheet.js";
    sheetScript.defer = true;
    document.head.appendChild(sheetScript);
  }

  // Load FramerMotion if not yet loaded via script tag
  if (!window.FramerMotion) {
    const fmScript = document.createElement("script");
    fmScript.src = "/js/framer-motion.js";
    fmScript.defer = true;
    fmScript.onload = () => {
      initFramerOrchestrator();
    };
    document.head.appendChild(fmScript);
  } else {
    initFramerOrchestrator();
  }
})();
