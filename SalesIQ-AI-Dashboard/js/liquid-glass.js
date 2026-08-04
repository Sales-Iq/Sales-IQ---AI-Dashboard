(function () {
  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  let tiltAttached = new WeakSet();

  document.addEventListener("mousemove", (event) => {
    const x = `${(event.clientX / window.innerWidth) * 100}%`;
    const y = `${(event.clientY / window.innerHeight) * 100}%`;
    document.documentElement.style.setProperty("--mouse-x", x);
    document.documentElement.style.setProperty("--mouse-y", y);
  });

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
    new MutationObserver(enhance).observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
})();
