(function () {
  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  let tiltAttached = new WeakSet();

  // Throttled via rAF: mousemove can fire 100+ times/sec, style writes
  // without throttling cause layout thrash on low-end devices.
  let mouseRaf = 0;
  let lastX = 0;
  let lastY = 0;
  document.addEventListener(
    "mousemove",
    (event) => {
      lastX = event.clientX;
      lastY = event.clientY;
      if (mouseRaf) return;
      mouseRaf = requestAnimationFrame(() => {
        mouseRaf = 0;
        document.documentElement.style.setProperty(
          "--mouse-x",
          `${(lastX / window.innerWidth) * 100}%`,
        );
        document.documentElement.style.setProperty(
          "--mouse-y",
          `${(lastY / window.innerHeight) * 100}%`,
        );
      });
    },
    { passive: true },
  );

  function addRiseAnimation() {
    const elements = document.querySelectorAll(
      ".glass, .glass-strong, .stat-card, .chart-box, .table-wrap, .modal-card, .liquid-panel",
    );
    elements.forEach((element, index) => {
      if (!element.dataset.liquidRiseDone) {
        element.classList.add("liquid-rise");
        element.style.animationDelay = `${Math.min(index * 0.035, 0.45)}s`;
        element.dataset.liquidRiseDone = "1";
      }
    });
  }

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
        if (rect.width < 60 || rect.height < 60) return;
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rotateY = (x / rect.width - 0.5) * 6;
        const rotateX = -(y / rect.height - 0.5) * 6;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  function addButtonMagnet() {
    document
      .querySelectorAll(".btn, .nav-link, .google-3d")
      .forEach((button) => {
        if (button.dataset.magnetDone) return;
        button.dataset.magnetDone = "1";
        button.addEventListener("mousemove", (event) => {
          const rect = button.getBoundingClientRect();
          const x = event.clientX - rect.left - rect.width / 2;
          const y = event.clientY - rect.top - rect.height / 2;
          button.style.setProperty("--mx", `${x * 0.12}px`);
          button.style.setProperty("--my", `${y * 0.12}px`);
        });
        button.addEventListener("mouseleave", () => {
          button.style.removeProperty("--mx");
          button.style.removeProperty("--my");
        });
      });
  }

  function enhance() {
    addRiseAnimation();
    addTiltEffect();
    addButtonMagnet();
  }

  window.addEventListener("DOMContentLoaded", () => {
    enhance();
    // Debounced observer: dashboard realtime listeners rewrite tables
    // frequently — re-enhancing synchronously on every mutation janks.
    let enhanceTimer = 0;
    new MutationObserver(() => {
      clearTimeout(enhanceTimer);
      enhanceTimer = setTimeout(enhance, 150);
    }).observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
})();
