/**
 * SalesIQ Liquid Glass Click & Interaction Engine
 * Cursor-following effects removed per user request.
 * Pure tactile click feedback and ripple effects enabled.
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
})();
