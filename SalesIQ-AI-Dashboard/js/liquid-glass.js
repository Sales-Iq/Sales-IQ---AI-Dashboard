(function () {
  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  const tiltAttached = new WeakSet();
  const magnetAttached = new WeakSet();

  // ── 1. Smooth Interpolated (Lerped) Cursor Glow Physics ──────────────────
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let isMoving = false;
  let lerpRaf = null;

  function updateLerpLoop() {
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    currentX += dx * 0.1;
    currentY += dy * 0.1;

    document.documentElement.style.setProperty(
      "--mouse-lerp-x",
      `${((currentX / window.innerWidth) * 100).toFixed(2)}%`,
    );
    document.documentElement.style.setProperty(
      "--mouse-lerp-y",
      `${((currentY / window.innerHeight) * 100).toFixed(2)}%`,
    );

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      lerpRaf = requestAnimationFrame(updateLerpLoop);
    } else {
      lerpRaf = null;
    }
  }

  document.addEventListener(
    "mousemove",
    (event) => {
      targetX = event.clientX;
      targetY = event.clientY;

      document.documentElement.style.setProperty(
        "--mouse-x",
        `${((targetX / window.innerWidth) * 100).toFixed(2)}%`,
      );
      document.documentElement.style.setProperty(
        "--mouse-y",
        `${((targetY / window.innerHeight) * 100).toFixed(2)}%`,
      );

      if (!lerpRaf) {
        lerpRaf = requestAnimationFrame(updateLerpLoop);
      }
    },
    { passive: true },
  );

  // ── 2. Staggered Cascading Entrance Reveals ───────────────────────────────
  function addRiseAnimation() {
    const elements = document.querySelectorAll(
      ".glass, .glass-strong, .stat-card, .chart-box, .table-wrap, .modal-card, .liquid-panel",
    );
    elements.forEach((element, index) => {
      if (!element.dataset.liquidRiseDone) {
        element.classList.add("liquid-rise");
        element.style.animationDelay = `${Math.min(index * 0.03, 0.4)}s`;
        element.dataset.liquidRiseDone = "1";
      }
    });
  }

  // ── 3. Hyper-Smooth 3D Card Tilt with Specular Spotlight ──────────────────
  function addTiltEffect() {
    const elements = document.querySelectorAll(
      ".glass, .glass-strong, .stat-card, .chart-box, .auth-card, .liquid-panel",
    );
    elements.forEach((card) => {
      if (tiltAttached.has(card)) return;
      tiltAttached.add(card);
      card.classList.add("liquid-tilt");

      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) return;

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;

        // Dynamic specular spotlight coordinates
        card.style.setProperty("--card-x", `${x.toFixed(1)}px`);
        card.style.setProperty("--card-y", `${y.toFixed(1)}px`);
        card.style.setProperty("--card-pct-x", `${pctX.toFixed(1)}%`);
        card.style.setProperty("--card-pct-y", `${pctY.toFixed(1)}%`);

        // Subtle, refined 3D tilt rotation
        const rotateY = ((x / rect.width) - 0.5) * 7.5;
        const rotateX = -((y / rect.height) - 0.5) * 7.5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease";
        card.style.transform = "";
        card.style.removeProperty("--card-x");
        card.style.removeProperty("--card-y");
        card.style.removeProperty("--card-pct-x");
        card.style.removeProperty("--card-pct-y");

        setTimeout(() => {
          card.style.transition = "";
        }, 450);
      });
    });
  }

  // ── 4. Elastic Magnetic Buttons & Interactive Elements ────────────────────
  function addButtonMagnet() {
    const interactiveElements = document.querySelectorAll(
      ".btn, .nav-link, .timeframe-tab, .chart-icon-btn, .chart-ctrl-select, .google-3d",
    );

    interactiveElements.forEach((el) => {
      if (magnetAttached.has(el)) return;
      magnetAttached.add(el);

      el.addEventListener("mousemove", (event) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (event.clientX - centerX) * 0.18;
        const deltaY = (event.clientY - centerY) * 0.18;

        el.style.setProperty("--mx", `${deltaX.toFixed(1)}px`);
        el.style.setProperty("--my", `${deltaY.toFixed(1)}px`);
        el.style.transform = `translate3d(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px, 0)`;
      });

      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        el.style.transform = "";
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");

        setTimeout(() => {
          el.style.transition = "";
        }, 350);
      });
    });
  }

  // ── 5. Master Enhance & Mutation Observer ─────────────────────────────────
  function enhance() {
    addRiseAnimation();
    addTiltEffect();
    addButtonMagnet();
  }

  window.addEventListener("DOMContentLoaded", () => {
    enhance();
    let enhanceTimer = 0;
    new MutationObserver(() => {
      clearTimeout(enhanceTimer);
      enhanceTimer = setTimeout(enhance, 120);
    }).observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
})();
