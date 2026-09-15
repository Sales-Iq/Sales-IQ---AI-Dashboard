(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const adminLinks = [
    ["dashboard", "Dashboard", "dashboard.html", "📊"],
    ["products", "Products", "products.html", "📦"],
    ["inventory", "Inventory", "inventory.html", "🏬"],
    ["sales", "Sales Records", "sales.html", "🧾"],
    ["add-sale", "Billing", "add-sale.html", "💳"],
    ["forecasting", "Forecasting", "forecasting.html", "🔮"],
    ["ai-insights", "AI Insights", "ai-insights.html", "🤖"],
    ["analytics", "Analytics", "analytics.html", "📈"],
    ["customers", "Customers", "customers.html", "👥"],
    ["suppliers", "Suppliers", "suppliers.html", "🚚"],
    ["purchases", "Restock", "purchases.html", "➕"],
    ["reports", "Reports", "reports.html", "📄"],
    ["users", "Admin & Staff", "users.html", "🛡️"],
    ["notifications", "Notifications", "notifications.html", "🔔"],
    ["settings", "Settings", "settings.html", "⚙️"],
  ];
  const staffLinks = [
    ["dashboard", "Dashboard", "dashboard.html", "📊"],
    ["add-sale", "Add Sale", "add-sale.html", "💳"],
    ["my-sales", "My Sales", "my-sales.html", "🧾"],
    ["stock-view", "Stock View", "stock-view.html", "📦"],
  ];
  function theme() {
    return localStorage.getItem("salesiq_theme") || "dark";
  }
  function applyTheme() {
    document.body.classList.toggle("light", theme() === "light");
    document.documentElement.classList.toggle("light", theme() === "light");
  }
  function empty(title, text) {
    return `<div class="empty-state"><strong>${title}</strong><span>${text}</span></div>`;
  }
  function money(n) {
    return `${localStorage.getItem("salesiq_currency") || "₹"}${Number(n || 0).toLocaleString("en-IN")}`;
  }
  function initShell() {
    applyTheme();
    const role =
      document.body.dataset.role ||
      (location.pathname.includes("/sales/") ? "sales" : "admin");
    const active = document.body.dataset.active || "dashboard";
    const links = role === "sales" ? staffLinks : adminLinks;
    const profile = JSON.parse(localStorage.getItem("salesiq_user") || "{}");
    const sidebar = $("#appSidebar");
    if (sidebar && !sidebar.innerHTML.trim()) {
      sidebar.innerHTML = `<div class="sidebar-logo"><div class="logo-mark">SIQ</div><div><div class="font-black text-xl tracking-tight">SalesIQ</div><div class="text-xs text-slate-400 font-bold">${role === "sales" ? "Sales Staff" : "Admin"} Workspace</div></div></div><nav>${links.map(([key, label, href, icon]) => `<a class="nav-link ${active === key ? "active" : ""}" href="${href}"><span>${icon}</span><span>${label}</span></a>`).join("")}</nav><div class="mt-4 p-3 glass rounded-2xl"><div class="text-xs text-slate-400 font-bold">Logged in</div><div class="font-black truncate">${profile.name || profile.email || "Waiting for Firebase..."}</div><a href="../profile.html" class="text-sky-300 text-sm font-bold hover:underline">Open Profile</a></div>`;
    }
    const header = $("#appHeader");
    if (header && !header.innerHTML.trim()) {
      header.innerHTML = `<div class="header-inner"><div class="flex items-center gap-3"><button id="fallbackSidebarToggle" class="mobile-menu-btn btn btn-ghost btn-sm">☰</button><div><div class="text-sm text-slate-400 font-bold">${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div><h1 class="text-xl md:text-2xl font-black tracking-tight">${document.title.replace("SalesIQ - ", "")}</h1></div></div><div class="flex items-center gap-2"><button id="fallbackThemeToggle" class="btn btn-ghost btn-sm">${theme() === "light" ? "🌙 Dark" : "☀️ Light"}</button><a class="btn btn-ghost btn-sm hide-mobile" href="../profile.html">Profile</a><a class="btn btn-danger btn-sm" href="../login.html">Login</a></div></div>`;
      $("#fallbackSidebarToggle")?.addEventListener("click", () =>
        $("#appSidebar")?.classList.toggle("open"),
      );
      $("#fallbackThemeToggle")?.addEventListener("click", () => {
        localStorage.setItem(
          "salesiq_theme",
          theme() === "light" ? "dark" : "light",
        );
        applyTheme();
        location.reload();
      });
    }
  }
  function initDashboardPlaceholders() {
    const adminStats = $("#adminStats");
    if (adminStats && !adminStats.innerHTML.trim()) {
      const rows = [
        ["Total sales today", money(0), "0 orders"],
        ["Monthly revenue", money(0), "0 monthly orders"],
        ["Total products", "0", "0 low stock"],
        ["Out of stock", "0", "0 customers"],
      ];
      adminStats.innerHTML = rows
        .map(
          (x) =>
            `<div class="glass stat-card glass-card-hover"><div class="stat-label">${x[0]}</div><div class="stat-value">${x[1]}</div><div class="stat-hint">${x[2]}</div></div>`,
        )
        .join("");
    }
    const salesStats = $("#staffStats");
    if (salesStats && !salesStats.innerHTML.trim()) {
      const rows = [
        ["Today’s sales", money(0), "0 orders"],
        ["Orders created", "0", "Your sales only"],
        ["Assigned products", "0", "From inventory"],
        ["Performance", "0%", "Add sales to calculate"],
      ];
      salesStats.innerHTML = rows
        .map(
          (x) =>
            `<div class="glass stat-card glass-card-hover"><div class="stat-label">${x[0]}</div><div class="stat-value">${x[1]}</div><div class="stat-hint">${x[2]}</div></div>`,
        )
        .join("");
    }
    if ($("#recentSales") && !$("#recentSales").innerHTML.trim())
      $("#recentSales").innerHTML = empty(
        "No recent sales",
        "Create your first sale from Billing.",
      );
    if ($("#aiSummary") && !$("#aiSummary").innerHTML.trim())
      $("#aiSummary").innerHTML = empty(
        "No AI summary yet",
        "Add products and sales to generate a real business summary.",
      );
    if ($("#staffStock") && !$("#staffStock").innerHTML.trim())
      $("#staffStock").innerHTML = empty(
        "No stock data",
        "Admin has not added products yet.",
      );
    if ($("#staffRecentSales") && !$("#staffRecentSales").innerHTML.trim())
      $("#staffRecentSales").innerHTML = empty(
        "No sales yet",
        "Create your first sale.",
      );
  }

  function initGenericEmptyStates() {
    const map = {
      productsTable: [
        "No products yet",
        "Click Add Product and save your first product.",
      ],
      inventoryTable: [
        "No inventory yet",
        "Products will appear here after you add them.",
      ],
      salesTable: [
        "No sales records yet",
        "Use Billing / Add Sale to create sales.",
      ],
      customersTable: [
        "No customers yet",
        "Customers will appear after billing or manual entry.",
      ],
      suppliersTable: [
        "No suppliers yet",
        "Click Add Supplier to save supplier data.",
      ],
      purchasesTable: [
        "No restock history yet",
        "Restock a product to create purchase history.",
      ],
      usersTable: [
        "No accounts found",
        "Admin and staff accounts will appear here after Firestore is connected.",
      ],
      notificationsList: [
        "No notifications yet",
        "Low stock, out-of-stock and sale alerts appear here.",
      ],
      mySalesTable: ["No sales yet", "Your sales history will appear here."],
      stockViewTable: ["No stock data", "Admin has not added products yet."],
      reportCards: [
        "Reports ready",
        "Add sales/products, then export PDF, CSV, Excel or JSON.",
      ],
      reportPreview: [
        "No report preview yet",
        "Choose a report option to preview/export data.",
      ],
      forecastOutput: [
        "No forecast yet",
        "Select a product and click Run Forecast.",
      ],
      forecastStats: [
        "Forecast values empty",
        "Forecast needs product stock and past sales.",
      ],
      exampleQuestions: [
        "AI example questions loading",
        "Gemini questions will appear here.",
      ],
      aiAnswer: [
        "Ask AI a business question",
        "AI answer will appear here after you ask.",
      ],
      movementList: [
        "No stock movement yet",
        "Fast/slow moving products appear after sales are added.",
      ],
      leastProducts: [
        "No least-selling data",
        "Add sales data to calculate least-selling products.",
      ],
      invoicePreview: [
        "Invoice preview",
        "Select a product and quantity to generate preview.",
      ],
    };
    Object.entries(map).forEach(([id, [title, text]]) => {
      const el = $("#" + id);
      if (el && !el.innerHTML.trim()) el.innerHTML = empty(title, text);
    });
  }

  function initCanvasPlaceholders() {
    document.querySelectorAll("canvas").forEach((c) => {
      if (c.dataset.fallbackDrawn) return;
      const ctx = c.getContext && c.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = c.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) return;
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = "rgba(148,163,184,.28)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(24, (rect.height / 5) * i);
        ctx.lineTo(rect.width - 20, (rect.height / 5) * i);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(148,163,184,.75)";
      ctx.font = "700 14px Inter, Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "No chart data yet — add products and sales",
        rect.width / 2,
        rect.height / 2,
      );
      c.dataset.fallbackDrawn = "1";
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    initShell();
    initDashboardPlaceholders();
    initGenericEmptyStates();
    setTimeout(initCanvasPlaceholders, 250);
    setTimeout(() => {
      initShell();
      initDashboardPlaceholders();
      initGenericEmptyStates();
      initCanvasPlaceholders();
    }, 1800);
  });
})();
