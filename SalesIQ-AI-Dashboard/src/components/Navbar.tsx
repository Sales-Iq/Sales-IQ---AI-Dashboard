import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ArrowRight } from "lucide-react";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("features");

  const navContainerRef = useRef<HTMLElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const activeSectionRef = useRef<string>("features");
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const scrollLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Interactive Demo", href: "#preview" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "AI & Analytics", href: "#ai-analytics" },
    { name: "Industries", href: "#industries" },
    { name: "Security", href: "#security" },
  ];

  // Measure element coordinates relative to the navigation pill container
  const getCoords = (el: HTMLElement) => {
    if (!el || !navContainerRef.current) {
      return { top: 0, left: 0, width: 0, height: 0, right: 0 };
    }
    const pRect = navContainerRef.current.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const top = Math.round(eRect.top - pRect.top);
    const left = Math.round(eRect.left - pRect.left + navContainerRef.current.scrollLeft);
    const width = Math.round(eRect.width);
    const height = Math.round(eRect.height);
    const containerWidth = navContainerRef.current.scrollWidth;
    const right = Math.max(0, Math.round(containerWidth - (left + width)));
    return { top, left, width, height, right, containerWidth };
  };

  const applyInstantCoords = (coords: { top: number; left: number; width: number; height: number }) => {
    const pill = pillRef.current;
    if (!pill) return;
    pill.style.transition = "none";
    pill.style.left = `${coords.left}px`;
    pill.style.right = "auto";
    pill.style.width = `${coords.width}px`;
    pill.style.top = `${coords.top}px`;
    pill.style.height = `${coords.height}px`;
    pill.style.opacity = "1";
    pill.style.transform = "scale(1, 1)";
  };

  // Kerfa Liquid Stretchy Tab Pill Animation:
  // Leading edge expands fast (stretch), trailing edge catches up halfway through!
  const animateTo = (targetEl: HTMLElement) => {
    const pill = pillRef.current;
    const container = navContainerRef.current;
    if (!pill || !container || !targetEl) return;

    const toCoords = getCoords(targetEl);
    const containerWidth = container.scrollWidth;

    const currentLeft = parseFloat(pill.style.left) || toCoords.left;
    const currentWidth = parseFloat(pill.style.width) || toCoords.width;
    const currentRight =
      parseFloat(pill.style.right) ||
      Math.max(0, containerWidth - (currentLeft + currentWidth));

    const isMovingRight = toCoords.left > currentLeft;
    const isMovingLeft = toCoords.left < currentLeft;

    if (!isMovingRight && !isMovingLeft) {
      applyInstantCoords(toCoords);
      return;
    }

    // 1. Reset transition and fix the starting span
    pill.style.transition = "none";
    pill.style.width = "auto";
    pill.style.left = `${currentLeft}px`;
    pill.style.right = `${currentRight}px`;
    pill.style.top = `${toCoords.top}px`;
    pill.style.height = `${toCoords.height}px`;
    pill.style.opacity = "1";
    pill.style.transform = "scale(1, 0.95)";
    void pill.offsetWidth; // Force synchronous reflow

    // 2. Set asymmetric leading vs trailing transition:
    // Leading edge shoots in 280ms (stretches), trailing edge catches up in 460ms!
    if (isMovingRight) {
      pill.style.transition =
        "right 280ms cubic-bezier(0.16, 1, 0.3, 1), left 460ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms ease, opacity 200ms ease";
    } else {
      pill.style.transition =
        "left 280ms cubic-bezier(0.16, 1, 0.3, 1), right 460ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms ease, opacity 200ms ease";
    }

    // 3. Move edges to destination coordinates
    pill.style.left = `${toCoords.left}px`;
    pill.style.right = `${toCoords.right}px`;
    pill.style.transform = "scale(1, 1)";

    // 4. On finish (470ms), dock into the destination element width and play squish rebound
    if (dockTimerRef.current) {
      clearTimeout(dockTimerRef.current);
    }
    dockTimerRef.current = setTimeout(() => {
      pill.style.transition = "none";
      pill.style.width = `${toCoords.width}px`;
      pill.style.right = "auto";
      pill.classList.remove("is-docking");
      void pill.offsetWidth;
      pill.classList.add("is-docking");
    }, 470);
  };

  // Mount initial pill position
  useEffect(() => {
    const initialTarget = tabRefs.current[activeSectionRef.current];
    if (initialTarget) {
      const timer = setTimeout(() => {
        applyInstantCoords(getCoords(initialTarget));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle window resize so pill stays accurately aligned
  useEffect(() => {
    const handleResize = () => {
      const currentTarget = tabRefs.current[activeSectionRef.current];
      if (currentTarget) {
        applyInstantCoords(getCoords(currentTarget));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll spy tracking
  useEffect(() => {
    const handleScroll = () => {
      // Do NOT trigger intermediate tab jumps while smooth scrolling to a clicked target!
      if (isProgrammaticScrollRef.current) return;

      const sectionOrder = [
        "preview",
        "features",
        "ai-analytics",
        "how-it-works",
        "industries",
        "security",
      ];

      // If near the bottom of page, highlight the last section
      const scrollBottom = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollBottom >= docHeight - 80) {
        if (activeSectionRef.current !== "security") {
          activeSectionRef.current = "security";
          setActiveSection("security");
          const targetEl = tabRefs.current["security"];
          if (targetEl) animateTo(targetEl);
        }
        return;
      }

      // Determine active section from scroll position
      const probeY = window.scrollY + 240;
      let matched = "";

      for (let i = sectionOrder.length - 1; i >= 0; i--) {
        const id = sectionOrder[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (probeY >= top) {
            matched = id;
            break;
          }
        }
      }

      const nextSection = matched || "features";
      if (nextSection !== activeSectionRef.current) {
        activeSectionRef.current = nextSection;
        setActiveSection(nextSection);
        const targetEl = tabRefs.current[nextSection];
        if (targetEl) animateTo(targetEl);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle clicking a navigation link
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    const id = href.replace("#", "");
    const targetEl = tabRefs.current[id];

    // 1. Lock programmatic scroll spy updates so it directly moves to clicked target without intermediate hopping!
    isProgrammaticScrollRef.current = true;
    if (scrollLockTimerRef.current) {
      clearTimeout(scrollLockTimerRef.current);
    }
    scrollLockTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 1200);

    // 2. Animate the liquid pill directly with stretch physics
    activeSectionRef.current = id;
    setActiveSection(id);
    if (targetEl) {
      animateTo(targetEl);
    }
    setMobileMenuOpen(false);

    // 3. Smooth scroll directly to the target section
    const sectionEl = document.getElementById(id);
    if (sectionEl) {
      const headerOffset = 90;
      const elementPosition = sectionEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      window.history.pushState(null, "", href);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none py-5 px-5 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Brand Logo matching website .logo-mark */}
        <a
          href="#"
          className="flex items-center gap-3 font-black text-xl sm:text-2xl text-white tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg px-1"
        >
          <div className="w-10 h-10 rounded-2xl logo-salesiq-mark flex items-center justify-center font-black text-sm tracking-wider shadow-lg">
            SIQ
          </div>
          <span>
            Sales<span className="text-sky-400">IQ</span>
          </span>
        </a>

        {/* Desktop Navigation Links with Dashboard Liquid Sliding Pill */}
        <nav
          ref={navContainerRef}
          className="hidden md:flex items-center gap-1 glass-pill px-2.5 py-1.5 rounded-full border border-sky-500/20 relative"
          style={{ isolation: "isolate" }}
        >
          {/* Kerfa Liquid Stretchy Pill */}
          <div
            ref={pillRef}
            className="navbar-liquid-pill"
            aria-hidden="true"
          />

          {navLinks.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <a
                key={link.name}
                ref={(el) => {
                  tabRefs.current[link.href.slice(1)] = el;
                }}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`relative text-xs lg:text-sm px-3.5 py-1.5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 select-none z-10 ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <span className="relative z-10">{link.name}</span>
              </a>
            );
          })}
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/login.html"
            className="inline-flex items-center justify-center text-xs lg:text-sm font-semibold text-white btn-salesiq-secondary px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Sign In
          </a>

          <a
            href="/register.html"
            className="inline-flex items-center gap-2 text-xs lg:text-sm font-bold text-white btn-salesiq-primary px-5 py-2.5 rounded-xl shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile Menu Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl glass-panel text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden pointer-events-auto max-w-lg mx-auto glass-panel border border-sky-500/20 bg-[#090d14]/95 backdrop-blur-2xl rounded-2xl overflow-hidden px-5 py-6 mt-3 shadow-2xl"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const isActive = activeSection === link.href.slice(1);
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`relative text-base font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-between ${
                      isActive
                        ? "text-white font-semibold bg-gradient-to-r from-sky-500/25 via-indigo-500/20 to-violet-500/25 border border-sky-400/40 shadow-glow"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    <span>{link.name}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    )}
                  </a>
                );
              })}

              <div className="h-[1px] bg-white/10 my-2" />

              <div className="flex flex-col gap-2.5 pt-2">
                <a
                  href="/login.html"
                  className="w-full text-center py-2.5 rounded-xl btn-salesiq-secondary text-sm font-semibold text-white shadow-md transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="/register.html"
                  className="w-full text-center py-2.5 rounded-xl btn-salesiq-primary text-white text-sm font-bold shadow-lg transition-colors"
                >
                  Get Started
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
