/**
 * SalesIQ Mobile Bottom-Sheet & Touch Interaction System
 * Native-feeling spring bottom-sheet with drag-to-dismiss gesture physics,
 * mobile chart inspection, collapsible cards, and floating quick dock.
 * 
 * Powered by Framer Motion spring physics and hardware-accelerated transforms.
 */
(function (global) {
  "use strict";

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  class MobileBottomSheetController {
    constructor() {
      this.isOpen = false;
      this.isDragging = false;
      this.startY = 0;
      this.currentY = 0;
      this.startTime = 0;
      this.sheetHeight = 0;
      this.activePortalSource = null;
      this.placeholderNode = null;
      this.chartInstances = new Map();

      this.initDom();
      this.bindEvents();
      this.autoEnhanceMobileCards();
      this.initMobileQuickDock();
    }

    /**
     * Create and inject the bottom sheet markup into DOM
     */
    initDom() {
      if (document.getElementById("mobileBottomSheetBackdrop")) return;

      const backdrop = document.createElement("div");
      backdrop.id = "mobileBottomSheetBackdrop";
      backdrop.className = "mobile-sheet-backdrop";
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.innerHTML = `
        <div id="mobileBottomSheet" class="mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="mobileSheetTitle">
          <div id="mobileSheetHandleBar" class="mobile-sheet-drag-handle-bar" title="Drag down to close">
            <div class="mobile-sheet-pill"></div>
          </div>
          <div class="mobile-sheet-header">
            <div class="mobile-sheet-title-group">
              <h3 id="mobileSheetTitle" class="mobile-sheet-title">Chart Details</h3>
              <span id="mobileSheetSubtitle" class="mobile-sheet-subtitle">Interactive mobile inspection</span>
            </div>
            <button id="mobileSheetCloseBtn" class="mobile-sheet-close" aria-label="Close sheet">✕</button>
          </div>
          <div id="mobileSheetContent" class="mobile-sheet-body"></div>
        </div>
      `;

      document.body.appendChild(backdrop);

      this.backdropEl = backdrop;
      this.sheetEl = document.getElementById("mobileBottomSheet");
      this.handleBarEl = document.getElementById("mobileSheetHandleBar");
      this.titleEl = document.getElementById("mobileSheetTitle");
      this.subtitleEl = document.getElementById("mobileSheetSubtitle");
      this.closeBtnEl = document.getElementById("mobileSheetCloseBtn");
      this.contentEl = document.getElementById("mobileSheetContent");
    }

    /**
     * Bind touch drag gestures, backdrop click, and keyboard listeners
     */
    bindEvents() {
      if (!this.backdropEl || !this.sheetEl) return;

      // Close button
      this.closeBtnEl?.addEventListener("click", () => this.close());

      // Backdrop tap dismiss
      this.backdropEl.addEventListener("click", (e) => {
        if (e.target === this.backdropEl) {
          this.close();
        }
      });

      // Escape key to dismiss
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isOpen) {
          this.close();
        }
      });

      // Touch Drag Gestures for the handle bar and sheet header
      const dragTargets = [this.handleBarEl, this.sheetEl.querySelector(".mobile-sheet-header")];

      dragTargets.forEach((target) => {
        if (!target) return;

        target.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: true });
        target.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: false });
        target.addEventListener("touchend", (e) => this.handleTouchEnd(e), { passive: true });
        target.addEventListener("touchcancel", (e) => this.handleTouchEnd(e), { passive: true });
      });
    }

    handleTouchStart(e) {
      if (!this.isOpen || e.touches.length !== 1) return;
      this.isDragging = true;
      this.startY = e.touches[0].clientY;
      this.currentY = this.startY;
      this.startTime = performance.now();
      this.sheetHeight = this.sheetEl.offsetHeight || window.innerHeight * 0.85;

      this.sheetEl.style.transition = "none";
    }

    handleTouchMove(e) {
      if (!this.isDragging || e.touches.length !== 1) return;
      this.currentY = e.touches[0].clientY;
      const deltaY = this.currentY - this.startY;

      // Only allow dragging downwards (or slight rubber-band upwards)
      if (deltaY < 0) {
        // Rubber-band resistance: deltaY / 3
        const resisted = deltaY / 3.5;
        this.sheetEl.style.transform = `translate3d(0, ${resisted}px, 0)`;
      } else {
        // Dragging downwards
        this.sheetEl.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        // Fade backdrop proportionally
        const opacity = Math.max(0, 1 - deltaY / (this.sheetHeight * 0.8));
        this.backdropEl.style.opacity = String(opacity);
      }

      if (e.cancelable) e.preventDefault();
    }

    handleTouchEnd(e) {
      if (!this.isDragging) return;
      this.isDragging = false;

      const deltaY = this.currentY - this.startY;
      const elapsed = performance.now() - this.startTime;
      const velocity = deltaY / Math.max(1, elapsed); // px per ms

      // Dismiss criteria: dragged down > 90px OR downward flick (velocity > 0.45 px/ms)
      if (deltaY > 90 || velocity > 0.45) {
        this.close();
      } else {
        // Elastic rebound snap back to top
        this.reboundToOpen();
      }
    }

    reboundToOpen() {
      this.backdropEl.style.opacity = "1";
      if (window.FramerMotion && typeof window.FramerMotion.springAnimate === "function") {
        window.FramerMotion.springAnimate(this.sheetEl, {
          from: { y: this.currentY - this.startY },
          to: { y: 0 },
          preset: "bouncy",
          onComplete: () => {
            this.sheetEl.style.transform = "translate3d(0, 0, 0)";
          },
        });
      } else {
        this.sheetEl.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
        this.sheetEl.style.transform = "translate3d(0, 0, 0)";
      }
    }

    /**
     * Open sheet with custom title and content
     */
    open({
      title = "Details",
      subtitle = "Interactive View",
      content = "",
      onOpen = null,
      onClose = null,
    } = {}) {
      this.initDom();
      this.titleEl.textContent = title;
      this.subtitleEl.textContent = subtitle;
      this.onCloseCallback = onClose;

      if (typeof content === "string") {
        this.contentEl.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.contentEl.innerHTML = "";
        this.contentEl.appendChild(content);
      }

      this.isOpen = true;
      document.body.classList.add("mobile-sheet-open");
      document.body.style.overflow = "hidden";

      this.backdropEl.classList.add("active");
      this.backdropEl.setAttribute("aria-hidden", "false");
      this.backdropEl.style.opacity = "1";

      if (prefersReduced) {
        this.sheetEl.style.transform = "translate3d(0, 0, 0)";
        this.sheetEl.style.transition = "none";
        if (typeof onOpen === "function") onOpen();
        return;
      }

      // Framer spring entrance
      this.sheetEl.style.transform = "translate3d(0, 100%, 0)";
      requestAnimationFrame(() => {
        if (window.FramerMotion && typeof window.FramerMotion.springAnimate === "function") {
          window.FramerMotion.springAnimate(this.sheetEl, {
            from: { y: window.innerHeight * 0.8 },
            to: { y: 0 },
            preset: "bouncy",
            onComplete: () => {
              this.sheetEl.style.transform = "translate3d(0, 0, 0)";
              if (typeof onOpen === "function") onOpen();
            },
          });
        } else {
          this.sheetEl.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
          this.sheetEl.style.transform = "translate3d(0, 0, 0)";
          if (typeof onOpen === "function") setTimeout(onOpen, 350);
        }
      });
    }

    /**
     * Open a chart tile directly inside the bottom sheet
     */
    openChartTile(tileElement) {
      if (!tileElement) return;

      const title =
        tileElement.querySelector("h3, .page-title, .chart-title")?.textContent?.trim() ||
        "Chart Details";
      const subtitle =
        tileElement.querySelector("p, .stat-hint, .chart-subtitle")?.textContent?.trim() ||
        "Full interactive chart inspection";

      // Clone interactive controls and canvas container
      const wrap = document.createElement("div");
      wrap.className = "mobile-sheet-chart-container";

      // Extract existing controls
      const controls = tileElement.querySelector(
        ".sales-chart-controls, .chart-header-controls, .chart-controls, .timeframe-tabs"
      );
      if (controls) {
        const controlsClone = controls.cloneNode(true);
        controlsClone.classList.add("mobile-sheet-injected-controls");
        wrap.appendChild(controlsClone);
      }

      // Check canvas
      const originalCanvas = tileElement.querySelector("canvas");
      if (originalCanvas) {
        const canvasWrap = document.createElement("div");
        canvasWrap.className = "mobile-sheet-canvas-wrap";
        const sheetCanvas = document.createElement("canvas");
        sheetCanvas.id = `sheetCanvas_${Date.now()}`;
        canvasWrap.appendChild(sheetCanvas);
        wrap.appendChild(canvasWrap);

        // Copy or recreate Chart.js instance on the new canvas
        this.open({
          title,
          subtitle,
          content: wrap,
          onOpen: () => {
            if (typeof Chart !== "undefined") {
              const origInstance = Chart.getChart(originalCanvas);
              if (origInstance) {
                // Replicate chart config
                const config = {
                  type: origInstance.config.type,
                  data: JSON.parse(JSON.stringify(origInstance.config.data)),
                  options: {
                    ...origInstance.config.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                      duration: prefersReduced ? 0 : 500,
                      easing: "easeOutQuart",
                    },
                    plugins: {
                      ...origInstance.config.options?.plugins,
                      legend: {
                        ...(origInstance.config.options?.plugins?.legend || {}),
                        labels: {
                          boxWidth: 12,
                          font: { size: 11 },
                          color: document.body.classList.contains("light") ? "#475569" : "#94a3b8",
                        },
                      },
                    },
                  },
                };
                try {
                  const newChart = new Chart(sheetCanvas, config);
                  this.chartInstances.set(sheetCanvas.id, newChart);
                  setTimeout(() => newChart.resize(), 100);
                } catch (err) {
                  console.warn("[MobileSheet] Chart replication fallback:", err);
                }
              }
            }
          },
          onClose: () => {
            const chart = this.chartInstances.get(sheetCanvas.id);
            if (chart) {
              chart.destroy();
              this.chartInstances.delete(sheetCanvas.id);
            }
          },
        });
      } else {
        // Fallback for non-canvas tiles (e.g. Leaderboard table, recent sales)
        const innerContent = tileElement.querySelector(".table-wrap, .stat-card-body, .recent-sales-table, table") || tileElement;
        const clone = innerContent.cloneNode(true);
        wrap.appendChild(clone);
        this.open({ title, subtitle, content: wrap });
      }
    }

    /**
     * Close the sheet with spring ease
     */
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;

      document.body.classList.remove("mobile-sheet-open");
      document.body.style.overflow = "";

      if (prefersReduced) {
        this.backdropEl.classList.remove("active");
        this.sheetEl.style.transform = "translate3d(0, 100%, 0)";
        this.contentEl.innerHTML = "";
        if (typeof this.onCloseCallback === "function") this.onCloseCallback();
        return;
      }

      this.backdropEl.style.transition = "opacity 0.25s ease";
      this.backdropEl.style.opacity = "0";

      this.sheetEl.style.transition = "transform 0.28s cubic-bezier(0.32, 0, 0.67, 0)";
      this.sheetEl.style.transform = "translate3d(0, 100%, 0)";

      setTimeout(() => {
        this.backdropEl.classList.remove("active");
        this.contentEl.innerHTML = "";
        if (typeof this.onCloseCallback === "function") {
          this.onCloseCallback();
          this.onCloseCallback = null;
        }
      }, 300);
    }

    /**
     * Automatically discover and inject "⛶ Expand / Sheet" buttons into chart tiles on mobile screens
     */
    autoEnhanceMobileCards() {
      function attachSheetTriggers() {
        const tiles = document.querySelectorAll(".chart-box, .dashboard-tile, [data-mobile-sheet='true']");
        tiles.forEach((tile) => {
          if (tile._hasSheetBtn) return;
          tile._hasSheetBtn = true;

          const header = tile.querySelector(
            ".sales-chart-title-area, .sales-chart-header, .chart-header, .flex.items-center.justify-between, h3"
          );
          if (!header) return;

          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "mobile-card-sheet-btn";
          btn.title = "Open full-screen mobile sheet inspection";
          btn.innerHTML = `<span class="mobile-sheet-icon">⛶</span><span class="mobile-sheet-btn-text">Sheet</span>`;

          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            window.MobileBottomSheet.openChartTile(tile);
          });

          // Insert into header
          if (header.classList.contains("sales-chart-title-area") || header.tagName === "H3") {
            const container = header.parentElement;
            if (container) {
              container.style.position = "relative";
              container.appendChild(btn);
            }
          } else {
            header.appendChild(btn);
          }
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", attachSheetTriggers);
      } else {
        attachSheetTriggers();
      }

      // Re-run on mutation
      if (typeof MutationObserver !== "undefined") {
        const obs = new MutationObserver(() => attachSheetTriggers());
        obs.observe(document.body, { childList: true, subtree: true });
      }
    }

    /**
     * Floating Quick Action Dock at bottom of mobile viewports
     */
    initMobileQuickDock() {
      if (document.getElementById("mobileQuickDock")) return;

      function createDock() {
        if (document.getElementById("mobileQuickDock")) return;
        const dock = document.createElement("nav");
        dock.id = "mobileQuickDock";
        dock.className = "mobile-quick-dock";
        dock.setAttribute("aria-label", "Mobile Quick Actions");

        // Role detection
        const role = document.body?.dataset?.role || "admin";
        const isSales = role === "sales";

        dock.innerHTML = `
          <button type="button" id="mobileDockRecordBtn" class="mobile-dock-btn mobile-dock-btn-primary" title="Record a sale">
            <span>➕</span>
            <span class="mobile-dock-label">Sale</span>
          </button>
          <button type="button" id="mobileDockChartsBtn" class="mobile-dock-btn" title="Inspect primary charts in bottom sheet">
            <span>📊</span>
            <span class="mobile-dock-label">Charts</span>
          </button>
          <button type="button" id="mobileDockTopBtn" class="mobile-dock-btn" title="Scroll smoothly to top">
            <span>⬆</span>
            <span class="mobile-dock-label">Top</span>
          </button>
        `;

        document.body.appendChild(dock);

        // Bind dock actions
        document.getElementById("mobileDockRecordBtn")?.addEventListener("click", () => {
          const manualBtn = document.getElementById("openManualSaleModal") || document.querySelector("a[href*='add-sale']");
          if (manualBtn) manualBtn.click();
        });

        document.getElementById("mobileDockChartsBtn")?.addEventListener("click", () => {
          const firstTile = document.querySelector("#salesChartTile, .chart-box, #staffChartTile");
          if (firstTile && window.MobileBottomSheet) {
            window.MobileBottomSheet.openChartTile(firstTile);
          }
        });

        document.getElementById("mobileDockTopBtn")?.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createDock);
      } else {
        createDock();
      }
    }
  }

  // Initialize and export globally
  const instance = new MobileBottomSheetController();
  global.MobileBottomSheet = instance;

})(typeof window !== "undefined" ? window : this);
