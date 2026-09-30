(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const header = document.querySelector("[data-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const loader = document.querySelector("[data-page-loader]");
  const heroStage = document.querySelector(".hero-card-scene");
  const placeholderCard = document.querySelector("[data-placeholder-card]");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let lenis = null;
  let heroAnimationPlayed = false;
  const LOADER_SESSION_KEY = "selfeng_loader_seen_bekzod";
  let autoAdvanceTimer = null;
  let autoAdvanceCancelled = false;

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  if (hasGsap) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  if (finePointer) {
    document.body.classList.add("has-fine-pointer");
  }

  if (!reducedMotion && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (value) => Math.min(1, 1.001 - Math.pow(2, -10 * value)),
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.12
    });

    if (hasGsap) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    }

    lenis.scrollTo(0, { immediate: true, force: true });
  }

  const resetInitialScroll = () => {
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true, force: true });
  };

  resetInitialScroll();
  window.addEventListener("DOMContentLoaded", resetInitialScroll);
  window.addEventListener("pageshow", resetInitialScroll);

  const closeMenu = () => {
    header?.classList.remove("is-menu-open");
    document.body.classList.remove("is-menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open menu");
    lenis?.start();
  };

  const openMenu = () => {
    header?.classList.add("is-menu-open");
    document.body.classList.add("is-menu-open");
    menuToggle?.setAttribute("aria-expanded", "true");
    menuToggle?.setAttribute("aria-label", "Close menu");
    lenis?.stop();
  };

  menuToggle?.addEventListener("click", () => {
    if (header?.classList.contains("is-menu-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  const scrollToTarget = (target, duration = 1.1) => {
    if (!target) return;

    if (lenis) {
      lenis.scrollTo(target, { offset: -88, duration });
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const cancelAutoAdvance = () => {
    autoAdvanceCancelled = true;
    if (autoAdvanceTimer !== null) {
      window.clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  };

  window.addEventListener("wheel", cancelAutoAdvance, { passive: true, once: true });
  window.addEventListener("touchstart", cancelAutoAdvance, { passive: true, once: true });
  window.addEventListener("keydown", cancelAutoAdvance, { once: true });

  const scheduleAutoAdvance = () => {
    if (reducedMotion || autoAdvanceCancelled) return;

    autoAdvanceTimer = window.setTimeout(() => {
      autoAdvanceTimer = null;
      if (autoAdvanceCancelled) return;
      scrollToTarget(document.querySelector(".logo-ticker"), 2.2);
    }, 3400);
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });
  });

  const loaderTimeZones = {
    cest: { timeZone: "Europe/Paris", label: "CEST" },
    gst: { timeZone: "Asia/Dubai", label: "GST" },
    current: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, label: "GMT+5" },
    aest: { timeZone: "Australia/Sydney", label: "AEST" }
  };

  const updateLoaderTimes = () => {
    document.querySelectorAll("[data-loader-time]").forEach((node) => {
      const config = loaderTimeZones[node.dataset.loaderTime];
      if (!config) return;

      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: config.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }).format(new Date());

      node.textContent = `${formatted} ${config.label}`;
    });
  };

  updateLoaderTimes();
  window.setInterval(updateLoaderTimes, 1000);

  const playHeroAnimation = () => {
    if (heroAnimationPlayed) return;
    heroAnimationPlayed = true;
    resetInitialScroll();
    loader?.remove();
  };

  const initHeroAnimation = () => {
    if (!hasGsap || reducedMotion) {
      playHeroAnimation();
      return;
    }

    let loaderSeen = false;
    try {
      loaderSeen = sessionStorage.getItem(LOADER_SESSION_KEY) === "1";
    } catch (error) {
      loaderSeen = false;
    }

    if (loaderSeen) {
      loader?.remove();
      window.gsap.set([header, ".hero-header-top", ".hero-btn-wrap"], { opacity: 0 });
      window.gsap.set(header, { y: -20 });
      window.gsap.set(".hero-header-top", { y: -20 });
      window.gsap.set(".hero-btn-wrap", { y: 20 });

      window.gsap
        .timeline({ delay: 0.5, defaults: { ease: "power3.out" } })
        .to([header, ".hero-header-top", ".hero-btn-wrap"], {
          opacity: 1,
          y: 0,
          duration: 1.4,
          stagger: 0.12,
          clearProps: "transform,opacity"
        });

      return;
    }

    try {
      sessionStorage.setItem(LOADER_SESSION_KEY, "1");
    } catch (error) {
      // Session storage is optional for the intro sequence.
    }

    window.gsap.set(".loader-brand", { yPercent: 25, filter: "blur(10px)", opacity: 0 });
    window.gsap.set(header, { yPercent: -100, opacity: 0 });
    window.gsap.set(".hero-header-top", { yPercent: -20, opacity: 0 });
    window.gsap.set(".hero-btn-wrap", { yPercent: 30, opacity: 0 });
    window.gsap.set(placeholderCard, {
      opacity: 0,
      scale: 0.82,
      y: 60,
      rotateX: 18,
      rotateY: -16
    });

    const cardTimeline = window.gsap.timeline({ paused: true, delay: 0.7 });
    cardTimeline.to(placeholderCard, {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      duration: 2.8,
      ease: "power3.out"
    });

    const heroTimeline = window.gsap.timeline({
      paused: true,
      delay: 1.2,
      onComplete: scheduleAutoAdvance
    });
    heroTimeline.to(header, { yPercent: 0, opacity: 1, duration: 1.6, ease: "power1.inOut" }, 0);
    heroTimeline.to(
      ".hero-header-top",
      { yPercent: 0, opacity: 1, duration: 1.8, ease: "power3.out" },
      0.35
    );
    heroTimeline.to(
      ".hero-btn-wrap",
      { yPercent: 0, opacity: 1, duration: 1.8, ease: "power3.out" },
      0.35
    );
    const loaderTimeline = window.gsap.timeline({ defaults: { ease: "power3.inOut" } });
    loaderTimeline
      .to(".loader-time-wrap", { opacity: 1, delay: 0.5 })
      .to(".loader-brand", { yPercent: 0, opacity: 1, duration: 0.9 })
      .to(".loader-brand", { filter: "blur(0px)", duration: 0.9 }, "<+=0.2")
      .to(
        ".page-loader",
        {
          scale: 1.2,
          transformOrigin: "center center",
          opacity: 0,
          duration: 2.1,
          onStart: () => {
            heroTimeline.play();
            cardTimeline.play();
          }
        },
        "same"
      )
      .to(".loader-brand", { opacity: 0, duration: 0.7 }, "same")
      .call(playHeroAnimation, null, "same+=2.1");
  };

  initHeroAnimation();

  if (finePointer && !reducedMotion && heroStage) {
    heroStage.addEventListener("pointermove", (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      heroStage.style.setProperty("--hero-x", `${x * 20}px`);
      heroStage.style.setProperty("--hero-y", `${y * 14}px`);
    });

    heroStage.addEventListener("pointerleave", () => {
      heroStage.style.setProperty("--hero-x", "0px");
      heroStage.style.setProperty("--hero-y", "0px");
    });
  }

  if (finePointer && !reducedMotion) {
    const cursorDot = document.querySelector(".cursor-dot");
    const cursorRing = document.querySelector(".cursor-ring");
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let ringX = cursorX;
    let ringY = cursorY;

    const updateCursor = () => {
      ringX += (cursorX - ringX) * 0.18;
      ringY += (cursorY - ringY) * 0.18;

      if (cursorDot) cursorDot.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
      if (cursorRing) cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(updateCursor);
    };

    window.addEventListener(
      "pointermove",
      (event) => {
        cursorX = event.clientX;
        cursorY = event.clientY;
      },
      { passive: true }
    );

    document.querySelectorAll("a, button, .feature-card, .template-card").forEach((element) => {
      element.addEventListener("mouseenter", () => document.body.classList.add("cursor-active"));
      element.addEventListener("mouseleave", () => document.body.classList.remove("cursor-active"));
    });

    updateCursor();
  }

  if (finePointer && !reducedMotion) {
    document.querySelectorAll(".magnetic").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.16;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.16;
        element.style.transform = `translate(${x}px, ${y}px)`;
      });

      element.addEventListener("pointerleave", () => {
        element.style.transform = "translate(0, 0)";
      });
    });
  }

  if (hasGsap && !reducedMotion) {
    const revealElements = Array.from(document.querySelectorAll(".reveal"));
    window.gsap.set(revealElements, { autoAlpha: 0, y: 36 });
    window.ScrollTrigger.batch(revealElements, {
      start: "top 88%",
      once: true,
      batchMax: 5,
      onEnter: (batch) =>
        window.gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          duration: 0.95,
          stagger: 0.08,
          ease: "power3.out",
          overwrite: true
        })
    });

    window.ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => header?.classList.toggle("is-scrolled", self.scroll() > 12)
    });

    window.ScrollTrigger.create({
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => heroStage?.style.setProperty("--hero-scroll", `${self.progress * 90}px`)
    });
  }

  const statementText = document.querySelector("[data-highlight]");
  if (statementText) {
    const words = statementText.textContent.trim().split(/\s+/);
    statementText.innerHTML = words.map((word) => `<span class="word">${word}</span>`).join(" ");
  }

  const statementWords = Array.from(document.querySelectorAll("[data-highlight] .word"));
  const statementSection = document.querySelector(".statement-section");
  const levelBadges = Array.from(document.querySelectorAll("[data-level]"));

  if (hasGsap && statementSection && statementWords.length && !reducedMotion) {
    if (levelBadges.length) {
      window.gsap.set(levelBadges, {
        autoAlpha: 0,
        y: 72,
        scale: 0.55,
        rotateX: -28,
        transformOrigin: "50% 100%"
      });
    }

    const statementTimeline = window.gsap.timeline({
      scrollTrigger: {
        trigger: statementSection,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8
      }
    });

    statementTimeline.to(statementWords, {
      color: "#0f0f0f",
      duration: 1,
      stagger: 0.08,
      ease: "none"
    });

    if (levelBadges.length) {
      statementTimeline.to(
        levelBadges,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotateX: 7,
          duration: 0.62,
          stagger: 0.24,
          ease: "back.out(1.7)"
        },
        0.38
      );
    }
  }

  if (hasGsap && !reducedMotion) {
    const cardCarousel = document.querySelector("[data-feature-carousel]");
    if (cardCarousel) {
      window.gsap.from(".feature-card", {
        autoAlpha: 0,
        y: 55,
        duration: 0.9,
        stagger: 0.09,
        ease: "power3.out",
        scrollTrigger: {
          trigger: cardCarousel,
          start: "top 82%",
          once: true
        }
      });
    }

    const controlStage = document.querySelector(".control-stage");
    if (controlStage) {
      window.gsap
        .timeline({
          scrollTrigger: {
            trigger: controlStage,
            start: "top 82%",
            once: true
          }
        })
        .from(".preview-card", {
          autoAlpha: 0,
          y: 42,
          duration: 0.9,
          stagger: 0.13,
          ease: "power3.out"
        })
        .from(
          ".range-line i",
          {
            scaleX: 0,
            duration: 1.1,
            ease: "power2.out"
          },
          "-=0.55"
        );
    }

    const selfingoSection = document.querySelector(".feature-selfingo");
    const selfingoRobot = document.querySelector(".selfingo-robot");
    if (selfingoSection && selfingoRobot) {
      window.gsap.fromTo(
        selfingoRobot,
        {
          y: 74,
          scale: 0.92
        },
        {
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: selfingoSection,
            start: "top 88%",
            end: "top 38%",
            scrub: 1
          }
        }
      );
    }

    const telegramPromo = document.querySelector(".telegram-promo-link");
    if (telegramPromo) {
      window.gsap.from(".telegram-promo-arrow", {
        autoAlpha: 0,
        scale: 0.62,
        rotate: -14,
        duration: 0.9,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: telegramPromo,
          start: "top 84%",
          once: true
        }
      });
    }

    const toolkitSection = document.querySelector(".story-toolkit");
    if (toolkitSection) {
      window.ScrollTrigger.create({
        trigger: toolkitSection,
        start: "top 78%",
        once: true,
        onEnter: () => toolkitSection.classList.add("is-marked")
      });
    }

    window.gsap.fromTo(
      ".toolkit-rating-image",
      { y: 70, scale: 0.96 },
      {
        y: 0,
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".story-toolkit",
          start: "top 90%",
          end: "top 25%",
          scrub: 1
        }
      }
    );

    const ratingPlaces = Array.from(document.querySelectorAll("[data-rating-place]"));
    if (toolkitSection && ratingPlaces.length) {
      const placeTimeline = window.gsap.timeline({
        scrollTrigger: {
          trigger: toolkitSection,
          start: "top 72%",
          end: "top 28%",
          scrub: 0.8
        }
      });

      ratingPlaces.forEach((place, index) => {
        placeTimeline.fromTo(
          place,
          {
            autoAlpha: 0,
            y: 90,
            scale: 0.72,
            rotateY: -24,
            transformOrigin: "50% 100%"
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotateY: [-8, -6, -5][index],
            duration: 0.9,
            ease: "power2.out"
          },
          index * 1.05
        );
      });
    }

    window.gsap.utils.toArray(".capability-media img, .double-card > img").forEach((image) => {
      window.gsap.fromTo(
        image,
        { yPercent: -4, scale: 1.08 },
        {
          yPercent: 4,
          scale: 1.02,
          ease: "none",
          scrollTrigger: {
            trigger: image.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.9
          }
        }
      );
    });

    window.gsap.fromTo(
      ".footer-wordmark img",
      { autoAlpha: 0, yPercent: 110 },
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 1.1,
        stagger: 0.08,
        ease: "power4.out",
        scrollTrigger: {
          trigger: ".footer-wordmark",
          start: "top 92%",
          once: true
        }
      }
    );
  }

  const galleryTrack = document.querySelector("[data-gallery-track]");
  const gallerySet = galleryTrack?.querySelector(".gallery-set");

  if (galleryTrack && gallerySet && !reducedMotion) {
    const galleryClone = gallerySet.cloneNode(true);
    galleryClone.setAttribute("aria-hidden", "true");
    galleryClone.querySelectorAll("a").forEach((link) => {
      link.tabIndex = -1;
    });
    galleryTrack.append(galleryClone);
  }

  const setHighlight = (name) => {
    document.querySelectorAll("[data-highlight]").forEach((item) => {
      item.classList.toggle("active", item.dataset.highlight === name);
    });
    document.querySelectorAll("[data-highlight-media]").forEach((media) => {
      media.classList.toggle("active", media.dataset.highlightMedia === name);
    });
  };

  document.querySelectorAll("[data-highlight] button").forEach((button) => {
    button.addEventListener("click", () => setHighlight(button.closest("[data-highlight]").dataset.highlight));
  });

  document.querySelector("[data-year]")?.append(String(new Date().getFullYear()));

  window.addEventListener("load", () => window.setTimeout(() => window.ScrollTrigger?.refresh(), 180));
  document.fonts?.ready.then(() => window.ScrollTrigger?.refresh());
})();
