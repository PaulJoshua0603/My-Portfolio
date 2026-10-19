(async () => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Footer year + Manila clock ----------
  $("#year").textContent = new Date().getFullYear();
  const clock = $("#clock");
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 1000);

  // CDN failed → plain static page
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
    root.classList.remove("js");
    $(".preloader")?.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  if (reduceMotion) root.classList.add("no-motion");
  await document.fonts.ready; // text is split by glyph metrics, so fonts must be in

  // ---------- Smooth scroll ----------
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // released after the intro
  }

  const scrollToTarget = (target) => {
    if (lenis) return lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    if (target === 0) return window.scrollTo({ top: 0 });
    target.scrollIntoView();
  };

  // ---------- Header / menu / anchors ----------
  const header = $("#header");
  const burger = $("#burger");
  const menu = $("#menu");

  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", !open);
    if (open) {
      lenis?.stop();
      gsap.fromTo(".menu__link", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: reduceMotion ? 0 : 0.8, stagger: 0.05, ease: "expo.out", delay: 0.1 });
    } else {
      lenis?.start();
    }
  };
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  document.addEventListener("keydown", (e) => e.key === "Escape" && document.body.classList.contains("menu-open") && setMenu(false));

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#hero" ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (document.body.classList.contains("menu-open")) setMenu(false);
      scrollToTarget(target);
    });
  });

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      const y = self.scroll();
      header.classList.toggle("is-scrolled", y > 30);
      header.classList.toggle("is-hidden", self.direction === 1 && y > 500 && !document.body.classList.contains("menu-open"));
    },
  });

  gsap.to(".progress span", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  const navLinks = $$(".nav__link");
  navLinks.forEach((link) => {
    const section = $(link.getAttribute("href"));
    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => self.isActive && navLinks.forEach((l) => l.classList.toggle("is-active", l === link)),
      onLeaveBack: () => section.id === "about" && link.classList.remove("is-active"),
    });
  });

  // ---------- Hero split ----------
  const heroChars = [];
  const accentWord = $(".hero__word--accent");
  // each char carries its slice of the word-wide gradient
  const paintAccent = () => {
    const w = accentWord.offsetWidth;
    $$(".char", accentWord).forEach((c) => {
      c.style.backgroundSize = `${w}px 100%`;
      c.style.backgroundPosition = `${-c.offsetLeft}px 0`;
    });
  };
  if (!reduceMotion) {
    $$(".hero__word[data-split]").forEach((el) => {
      heroChars.push(...SplitText.create(el, { type: "chars", charsClass: "char", tag: "span" }).chars);
    });
    accentWord.classList.add("is-split");
    paintAccent();
    window.addEventListener("resize", paintAccent);
  }

  // ---------- Hero role rotator ----------
  const rotator = $(".rotator");
  const roles = $$(".rotator__item", rotator);
  let roleIdx = 0;
  rotator.classList.add("is-ready");
  gsap.set(roles, { yPercent: 110 });
  gsap.set(roles[0], { yPercent: 0 });
  const fitRotator = () => gsap.set(rotator, { width: roles[roleIdx].offsetWidth });
  fitRotator();
  window.addEventListener("resize", fitRotator);

  const nextRole = () => {
    const cur = roles[roleIdx];
    roleIdx = (roleIdx + 1) % roles.length;
    const nxt = roles[roleIdx];
    const d = reduceMotion ? 0 : 0.9;
    gsap.timeline({ defaults: { duration: d, ease: "expo.inOut" } })
      .to(cur, { yPercent: -110 })
      .fromTo(nxt, { yPercent: 110 }, { yPercent: 0 }, 0)
      .to(rotator, { width: nxt.offsetWidth }, 0);
    gsap.delayedCall(2.6, nextRole);
  };

  // ---------- Hero intro timeline ----------
  const heroTl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
  if (!reduceMotion) {
    heroTl
      .from(".hero__bg", { opacity: 0, duration: 2, ease: "power2.out" }, 0)
      .from(heroChars, { yPercent: 110, duration: 1.4, stagger: 0.03 }, 0.05)
      .from(".portrait__frame", { clipPath: "inset(100% 0% 0% 0% round 28px)", duration: 1.5, ease: "expo.inOut" }, 0)
      .from(".portrait__frame img", { scale: 1.15, duration: 2 }, 0.25)
      .from(".hero__fade", { y: 30, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.5)
      .from(".header__inner", { y: -24, opacity: 0, duration: 1.2 }, 0.6);
  }

  const startSite = () => {
    lenis?.start();
    gsap.delayedCall(2.4, nextRole);
  };

  // ---------- Preloader ----------
  const preloader = $(".preloader");
  let seenIntro = false;
  try {
    seenIntro = sessionStorage.getItem("pc-intro") === "1";
    sessionStorage.setItem("pc-intro", "1");
  } catch (_) { /* storage blocked */ }

  const runIntro = async () => {
    if (reduceMotion) {
      preloader.remove();
      startSite();
      return;
    }
    const count = $("#loaderCount");
    const counter = { v: 0 };
    const dur = seenIntro ? 0.6 : 1.6;
    await gsap.timeline()
      .from(".preloader__name span span", { yPercent: 110, duration: 1, stagger: 0.08, ease: "expo.out" }, 0)
      .from(".preloader__role", { opacity: 0, y: 10, duration: 0.6 }, 0.3)
      .to(counter, { v: 100, duration: dur, ease: "power2.inOut", onUpdate: () => (count.textContent = Math.round(counter.v)) }, 0)
      .to(".preloader__bar span", { scaleX: 1, duration: dur, ease: "power2.inOut" }, 0)
      .then();

    await gsap.timeline()
      .to(".preloader__inner, .preloader__count", { yPercent: -40, opacity: 0, duration: 0.6, ease: "power3.in" })
      .to(preloader, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, "-=0.15")
      .add(() => heroTl.play(), "-=0.75")
      .then();

    preloader.remove();
    startSite();
  };
  runIntro();

  // ---------- Projects: pinned horizontal scroll on large screens ----------
  const mm = gsap.matchMedia();
  mm.add(
    {
      horizontal: "(min-width: 1024px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)",
      motion: "(prefers-reduced-motion: no-preference)",
    },
    (ctx) => {
      const { horizontal, motion } = ctx.conditions;

      if (horizontal) {
        const section = $(".projects");
        const track = $(".projects__track");
        const cards = $$(".project", track);
        const current = $("#projCurrent");
        section.classList.add("is-horizontal");
        const distance = () => track.scrollWidth - window.innerWidth;

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => "+=" + distance(),
            pin: true,
            scrub: 0.8,
            refreshPriority: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              current.textContent = String(Math.min(cards.length, Math.round(self.progress * (cards.length - 1)) + 1)).padStart(2, "0");
            },
          },
        });

        // cards that start off-screen fade up as they arrive
        cards.filter((card) => card.getBoundingClientRect().left > window.innerWidth).forEach((card) => {
          gsap.from(card, {
            y: 40,
            opacity: 0.3,
            ease: "none",
            scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 100%", end: "left 70%", scrub: true },
          });
        });

        return () => section.classList.remove("is-horizontal");
      }

      if (!motion) return;

      // tablet / mobile: projects as a grid
      gsap.set(".project", { y: 50, opacity: 0 });
      ScrollTrigger.batch(".project", {
        start: "top 90%",
        once: true,
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "expo.out" }),
      });
    }
  );

  // ---------- Scroll reveals ----------
  if (!reduceMotion) {
    gsap.to(".portrait", { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    // About statement — words light up as you scroll
    const statement = $("[data-scrub-text]");
    const words = SplitText.create(statement, { type: "words" }).words;
    gsap.fromTo(words, { opacity: 0.16 }, {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: statement, start: "top 82%", end: "bottom 50%", scrub: true },
    });

    // Section titles — masked line reveal
    $$("[data-split-lines]").forEach((el) => {
      SplitText.create(el, {
        type: "lines",
        linesClass: "split-line",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110, duration: 1.2, stagger: 0.1, ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 86%", once: true },
          }),
      });
    });

    // Generic fade-up
    gsap.set(".reveal, .job__card", { y: 40, opacity: 0 });
    ScrollTrigger.batch(".reveal, .job__card", {
      start: "top 90%",
      once: true,
      onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: "power3.out", overwrite: true }),
    });

    // Experience timeline progress
    gsap.fromTo(".timeline__progress span", { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".timeline", start: "top 60%", end: "bottom 60%", scrub: true },
    });

    // Footer name rises in
    const giant = $(".footer__giant");
    const giantChars = SplitText.create(giant, { type: "chars", charsClass: "char", tag: "span" }).chars;
    giant.classList.add("is-split");
    gsap.from(giantChars, {
      yPercent: 100, ease: "none", stagger: 0.05,
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true },
    });

    // Stat counters
    $$("[data-count]").forEach((el) => {
      const obj = { v: 0 };
      el.textContent = "0";
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => gsap.to(obj, { v: +el.dataset.count, duration: 2, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(obj.v)) }),
      });
    });
  }

  // Timeline dots light up
  $$(".job").forEach((job) => {
    ScrollTrigger.create({
      trigger: job,
      start: "top 60%",
      onEnter: () => job.classList.add("is-active"),
      onLeaveBack: () => job.classList.remove("is-active"),
    });
  });

  // ---------- Copy email ----------
  const toast = $("#toast");
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-show");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove("is-show"), 2200);
  };
  $("#copyEmail").addEventListener("click", async (e) => {
    const email = e.currentTarget.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      showToast("Email copied to clipboard ✓");
    } catch (_) {
      window.location.href = `mailto:${email}`;
    }
  });

  // ---------- Certificate lightbox ----------
  const lightbox = $("#lightbox");
  const lbImg = $("img", lightbox);
  $$(".cert").forEach((btn) => {
    btn.addEventListener("click", () => {
      lbImg.src = btn.dataset.full;
      lbImg.alt = $("img", btn).alt;
      lightbox.showModal();
      lenis?.stop();
      if (!reduceMotion) gsap.fromTo(lbImg, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "expo.out" });
    });
  });
  $(".lightbox__close").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (e) => e.target === lightbox && lightbox.close());
  lightbox.addEventListener("close", () => lenis?.start());

  // Recalculate once images have settled
  const refresh = () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); };
  document.readyState === "complete" ? refresh() : window.addEventListener("load", refresh);
})();
