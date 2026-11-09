/**
 * SalesIQ Framer Motion Spring & Micro-Interaction Engine
 * Authentic analytical spring physics, staggered waterfalls, fluid layout pills,
 * and tactile press dynamics inspired by Framer Motion.
 * 
 * Hardware-accelerated (transform & opacity only), 60-120 FPS composited.
 * Zero-dependency Vanilla JS.
 */
(function (global) {
  "use strict";

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * Analytical Second-Order Differential Equation Spring Solver
   * Solves: m*x'' + c*x' + k*x = 0
   * 
   * @param {Object} config
   * @param {number} [config.stiffness=300] - Tension of the spring
   * @param {number} [config.damping=28]     - Resistance to oscillation
   * @param {number} [config.mass=1]         - Weight of the object
   * @param {number} [config.velocity=0]     - Initial velocity
   * @returns {Function} Function(tInSeconds) => progress (0 to 1+)
   */
  function createSpringSolver({
    stiffness = 300,
    damping = 28,
    mass = 1,
    velocity = 0,
  } = {}) {
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));

    if (zeta < 1) {
      // Underdamped: Oscillates smoothly around target and settles
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      const b = (zeta * w0 - velocity) / wd;
      return function (t) {
        if (t <= 0) return 0;
        const decay = Math.exp(-zeta * w0 * t);
        return 1 - decay * (Math.cos(wd * t) + b * Math.sin(wd * t));
      };
    } else if (zeta === 1) {
      // Critically damped: Reaches target fastest without overshoot
      return function (t) {
        if (t <= 0) return 0;
        return 1 - (1 + (w0 - velocity) * t) * Math.exp(-w0 * t);
      };
    } else {
      // Overdamped: Sluggish return without oscillation
      const s1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
      const c1 = (velocity - s2) / (s1 - s2);
      const c2 = 1 - c1;
      return function (t) {
        if (t <= 0) return 0;
        return 1 - (c1 * Math.exp(s1 * t) + c2 * Math.exp(s2 * t));
      };
    }
  }

  // Pre-configured Framer Spring Presets
  const SpringPresets = {
    // Crisp, snappy micro-interactions (buttons, tabs, toggles)
    snappy: { stiffness: 420, damping: 32, mass: 1 },
    // Balanced, organic feel (cards, modals, panels)
    gentle: { stiffness: 280, damping: 26, mass: 1 },
    // Soft, flowing physics (page transitions, drawers)
    smooth: { stiffness: 180, damping: 24, mass: 1 },
    // Playful, energetic overshoot (badges, success popups)
    bouncy: { stiffness: 350, damping: 20, mass: 1 },
  };

  /**
   * Animate element properties using analytical spring physics
   */
  function springAnimate(element, {
    from = {},
    to = {},
    preset = "gentle",
    springConfig = null,
    duration = 800, // Max failsafe duration in ms
    onUpdate = null,
    onComplete = null,
  } = {}) {
    if (!element) return () => {};

    if (prefersReduced) {
      // Instant transition for reduced-motion
      applyTransformStyles(element, to);
      if (typeof onComplete === "function") onComplete();
      return () => {};
    }

    if (element._framerSpringRaf) {
      cancelAnimationFrame(element._framerSpringRaf);
      element._framerSpringRaf = null;
    }

    const config = springConfig || SpringPresets[preset] || SpringPresets.gentle;
    const solver = createSpringSolver(config);
    const startTime = performance.now();

    const fromY = from.y !== undefined ? from.y : 0;
    const toY = to.y !== undefined ? to.y : 0;
    const fromX = from.x !== undefined ? from.x : 0;
    const toX = to.x !== undefined ? to.x : 0;
    const fromScale = from.scale !== undefined ? from.scale : 1;
    const toScale = to.scale !== undefined ? to.scale : 1;
    const fromOpacity = from.opacity !== undefined ? from.opacity : 1;
    const toOpacity = to.opacity !== undefined ? to.opacity : 1;

    function step(now) {
      const elapsedSec = (now - startTime) / 1000;
      const progress = solver(elapsedSec);

      const curY = fromY + (toY - fromY) * progress;
      const curX = fromX + (toX - fromX) * progress;
      const curScale = fromScale + (toScale - fromScale) * progress;
      const curOpacity = Math.max(0, Math.min(1, fromOpacity + (toOpacity - fromOpacity) * progress));

      element.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0) scale(${curScale.toFixed(4)})`;
      if (from.opacity !== undefined || to.opacity !== undefined) {
        element.style.opacity = curOpacity.toFixed(3);
      }

      if (typeof onUpdate === "function") {
        onUpdate(progress, { x: curX, y: curY, scale: curScale, opacity: curOpacity });
      }

      // Check if settled (progress very close to 1 and velocity negligible or elapsed reached)
      const isSettled = elapsedSec >= duration / 1000 || (Math.abs(progress - 1) < 0.001 && elapsedSec > 0.2);

      if (!isSettled) {
        element._framerSpringRaf = requestAnimationFrame(step);
      } else {
        // Settle clean
        element.style.transform = to.scale !== undefined && to.scale === 1 && toY === 0 && toX === 0
          ? ""
          : `translate3d(${toX}px, ${toY}px, 0) scale(${toScale})`;
        if (to.opacity !== undefined) element.style.opacity = String(toOpacity);
        element._framerSpringRaf = null;
        if (typeof onComplete === "function") onComplete();
      }
    }

    element._framerSpringRaf = requestAnimationFrame(step);
    return () => {
      if (element._framerSpringRaf) {
        cancelAnimationFrame(element._framerSpringRaf);
        element._framerSpringRaf = null;
      }
    };
  }

  function applyTransformStyles(el, to) {
    const x = to.x || 0;
    const y = to.y || 0;
    const scale = to.scale !== undefined ? to.scale : 1;
    el.style.transform = (x === 0 && y === 0 && scale === 1) ? "" : `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    if (to.opacity !== undefined) el.style.opacity = String(to.opacity);
  }

  /**
   * Staggered Spring Waterfall Ingress for card grids & containers
   * Cascades elements into view with Framer spring physics.
   */
  function staggerIn(container, selector = ".stat-card, .chart-box, .glass-card, tr", options = {}) {
    if (!container) return;
    const elements = Array.from(container.querySelectorAll(selector));
    if (!elements.length) return;

    if (prefersReduced) {
      elements.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "";
      });
      return;
    }

    const {
      stagger = 40,
      yOffset = 18,
      initialScale = 0.96,
      preset = "gentle",
      baseDelay = 0,
    } = options;

    elements.forEach((el, index) => {
      // Prevent double animating already active elements
      if (el.dataset.framerEntered === "true") return;
      el.dataset.framerEntered = "true";

      el.style.opacity = "0";
      el.style.transform = `translate3d(0, ${yOffset}px, 0) scale(${initialScale})`;
      el.style.willChange = "transform, opacity";

      const delay = baseDelay + index * stagger;
      setTimeout(() => {
        springAnimate(el, {
          from: { y: yOffset, scale: initialScale, opacity: 0 },
          to: { y: 0, scale: 1, opacity: 1 },
          preset,
          onComplete: () => {
            el.style.willChange = "";
          },
        });
      }, delay);
    });
  }

  /**
   * Tactile Spring Press Elasticity
   * Compresses smoothly on pointerdown, rebounds on release with spring damping
   */
  function initSpringPress() {
    if (prefersReduced) return;

    document.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const target = e.target?.closest?.(
        ".btn, button, .tile-action-btn, .timeframe-tab, .chart-icon-btn, .chip, .col-preset-btn, .tab-btn"
      );
      if (!target) return;

      const currentTransform = window.getComputedStyle(target).transform;
      // Animate to compressed state
      target.style.transition = "transform 0.08s cubic-bezier(0.16, 1, 0.3, 1)";
      target.style.transform = "scale(0.95) translateZ(0)";

      function handleRelease() {
        target.style.transition = "";
        springAnimate(target, {
          from: { scale: 0.95 },
          to: { scale: 1 },
          preset: "bouncy",
        });
        cleanup();
      }

      function cleanup() {
        target.removeEventListener("pointerup", handleRelease);
        target.removeEventListener("pointercancel", handleRelease);
        target.removeEventListener("pointerleave", handleRelease);
      }

      target.addEventListener("pointerup", handleRelease, { once: true });
      target.addEventListener("pointercancel", handleRelease, { once: true });
      target.addEventListener("pointerleave", handleRelease, { once: true });
    }, { passive: true });
  }

  /**
   * Sliding Fluid Spring Layout Pill (Framer layoutId equivalent)
   * Smoothly glides a backdrop highlight between active tabs or timeframe selectors
   */
  function initSlidingLayoutPills() {
    if (prefersReduced) return;

    const groupSelectors = [
      ".timeframe-tabs",
      ".tabs-bar",
      ".filter-pill-group",
      ".nav-pills",
      ".chart-timeframe-group"
    ];

    function setupPillForGroup(group) {
      if (group._hasFramerPill) return;
      group._hasFramerPill = true;

      // Ensure group has relative positioning
      const groupStyle = window.getComputedStyle(group);
      if (groupStyle.position === "static") {
        group.style.position = "relative";
      }

      // Check or create pill indicator element
      let pill = group.querySelector(".framer-sliding-pill");
      if (!pill) {
        pill = document.createElement("div");
        pill.className = "framer-sliding-pill";
        group.insertBefore(pill, group.firstChild);
      }

      function updatePillPosition(activeItem, animate = true) {
        if (!activeItem) return;
        const groupRect = group.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();

        const x = itemRect.left - groupRect.left;
        const y = itemRect.top - groupRect.top;
        const width = itemRect.width;
        const height = itemRect.height;

        pill.style.width = `${width}px`;
        pill.style.height = `${height}px`;
        pill.style.opacity = "1";

        if (animate && pill._hasPositioned) {
          pill.style.transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.28s cubic-bezier(0.16, 1, 0.3, 1)";
        } else {
          pill.style.transition = "none";
          pill._hasPositioned = true;
        }

        pill.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      // Find initial active item
      const activeItem = group.querySelector(".active, [aria-selected='true'], .selected");
      if (activeItem) {
        requestAnimationFrame(() => updatePillPosition(activeItem, false));
      }

      // Listen for tab switches
      group.addEventListener("click", (e) => {
        const item = e.target.closest("button, .tab-btn, .timeframe-tab, a");
        if (item && group.contains(item)) {
          requestAnimationFrame(() => updatePillPosition(item, true));
        }
      });
    }

    // Auto-discover groups
    groupSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach(setupPillForGroup);
    });

    // Mutation observer for dynamically rendered tab bars
    const observer = new MutationObserver(() => {
      groupSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach(setupPillForGroup);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Spring Number Roll-Up Ticker
   * Fluid deceleration with Framer spring velocity for KPI cards
   */
  function springTicker(element, targetStr, options = {}) {
    if (!element) return;
    if (prefersReduced) {
      element.textContent = targetStr;
      return;
    }

    const {
      duration = 900,
      preset = "gentle",
      onComplete = null,
    } = options;

    const raw = String(targetStr).trim();
    // Parse prefix (e.g. $, €), number, decimals, and suffix (e.g. %, orders)
    const match = raw.match(/^([^0-9\-+]*)([\-+0-9.,]+)(.*)$/);
    if (!match) {
      element.textContent = targetStr;
      return;
    }

    const prefix = match[1] || "";
    const numPart = match[2].replace(/,/g, "");
    const suffix = match[3] || "";
    const targetVal = parseFloat(numPart);

    if (isNaN(targetVal)) {
      element.textContent = targetStr;
      return;
    }

    const decimals = (numPart.split(".")[1] || "").length;
    const startVal = typeof element._framerCountVal === "number" ? element._framerCountVal : 0;

    if (startVal === targetVal && element._framerHasCounted) {
      element.textContent = targetStr;
      return;
    }

    if (element._framerCountRaf) {
      cancelAnimationFrame(element._framerCountRaf);
      element._framerCountRaf = null;
    }

    element._framerHasCounted = true;
    const solver = createSpringSolver(SpringPresets[preset] || SpringPresets.gentle);
    const startTime = performance.now();

    function formatNumber(val) {
      const formatted = val.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix}${formatted}${suffix}`;
    }

    function step(now) {
      const elapsedSec = (now - startTime) / 1000;
      const progress = solver(elapsedSec);
      const currentVal = startVal + (targetVal - startVal) * progress;

      element.textContent = formatNumber(currentVal);

      const isSettled = elapsedSec >= duration / 1000 || (Math.abs(progress - 1) < 0.001 && elapsedSec > 0.25);

      if (!isSettled) {
        element._framerCountRaf = requestAnimationFrame(step);
      } else {
        element.textContent = targetStr;
        element._framerCountVal = targetVal;
        element._framerCountRaf = null;
        if (typeof onComplete === "function") onComplete();
      }
    }

    element._framerCountRaf = requestAnimationFrame(step);
  }

  /**
   * Spring Modal Pop and Backdrop Fade
   */
  function springModalOpen(modalElement) {
    if (!modalElement || prefersReduced) return;
    const card = modalElement.querySelector(".modal-card, .modal-box, .glass") || modalElement;
    springAnimate(card, {
      from: { scale: 0.92, y: 16, opacity: 0 },
      to: { scale: 1, y: 0, opacity: 1 },
      preset: "bouncy",
    });
  }

  // Public Framer Motion API
  const FramerMotion = {
    createSpringSolver,
    springAnimate,
    staggerIn,
    springTicker,
    springModalOpen,
    SpringPresets,
    initSpringPress,
    initSlidingLayoutPills,
  };

  global.FramerMotion = FramerMotion;

  // Auto-initialize when DOM is ready
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initSpringPress();
        initSlidingLayoutPills();
      });
    } else {
      initSpringPress();
      initSlidingLayoutPills();
    }
  }
})(typeof window !== "undefined" ? window : this);
