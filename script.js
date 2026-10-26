(async () => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Footer year + Manila clocks ----------
  $("#year").textContent = new Date().getFullYear();
  const clocks = $$("[data-clock]");
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const tick = () => clocks.forEach((c) => (c.textContent = fmt.format(new Date())));
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
      .from(".portrait__frame", { clipPath: "inset(100% 0% 0% 0% round 28px)", duration: 1.5, ease: "expo.inOut" }, 0)
      .from(".portrait__frame img", { scale: 1.15, duration: 2 }, 0.25)
      .from(".hero__fade", { y: 30, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.5)
      .from(".header__inner", { y: -24, opacity: 0, duration: 1.2 }, 0.6);
  }

  const startSite = () => {
    lenis?.start();
    gsap.delayedCall(2.4, nextRole);
  };

  // ---------- Intro: name builds in the centre, then flies into the hero title ----------
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
    // the flight lands on the hero title, so measure it from the top of the page
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const title = $(".hero__title");
    const cs = getComputedStyle(title);
    const k = seenIntro ? 0.55 : 1;

    // a copy of each hero word, placed exactly over the original
    const words = $$(".hero__word").map((src) => {
      const r = src.getBoundingClientRect();
      const el = document.createElement("span");
      el.className = "intro__word" + (src.classList.contains("hero__word--accent") ? " intro__word--accent" : "");
      el.innerHTML = [...src.textContent].map((c) => `<span class="intro__char">${c === " " ? "&nbsp;" : c}</span>`).join("");
      Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, fontSize: cs.fontSize, letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight });
      preloader.append(el);
      return { el, r };
    });
    // each accent char carries its slice of the word-wide gradient
    $$(".intro__word--accent", preloader).forEach((word) => {
      $$(".intro__char", word).forEach((c) => {
        c.style.backgroundSize = `${word.offsetWidth}px 100%`;
        c.style.backgroundPosition = `${-c.offsetLeft}px 0`;
      });
    });
    // start as one block in the middle of the screen
    const dy = (window.innerHeight - (words.at(-1).r.bottom - words[0].r.top)) / 2 - words[0].r.top;
    words.forEach(({ el, r }) => gsap.set(el, { x: (window.innerWidth - r.width) / 2 - r.left, y: dy }));
    gsap.set(title, { autoAlpha: 0 });

    await gsap.timeline()
      .from($$(".intro__char", preloader), { yPercent: 100, opacity: 0, duration: 0.9, stagger: 0.035 * k, ease: "expo.out" })
      .to(".intro__bar span", { scaleX: 1, duration: 1.1 * k, ease: "power2.inOut" }, 0.15)
      .to(".intro__bar", { opacity: 0, duration: 0.3 })
      .addLabel("fly", "-=0.1")
      .to(words.map((w) => w.el), { x: 0, y: 0, duration: 1.2, ease: "expo.inOut", stagger: 0.05 }, "fly")
      .to(".intro__bg", { opacity: 0, duration: 0.9, ease: "power2.inOut" }, "fly+=0.35")
      .add(() => heroTl.play(), "fly+=0.3")
      .then();

    // copy has landed on the real title: swap them
    gsap.set(title, { autoAlpha: 1 });
    preloader.remove();
    startSite();
  };
  runIntro();

  // ---------- Work: laptop + phone showcase, pinned on large screens ----------
  const mm = gsap.matchMedia();
  mm.add(
    {
      pinned: "(min-width: 1024px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)",
      motion: "(prefers-reduced-motion: no-preference)",
    },
    (ctx) => {
      const { pinned, motion } = ctx.conditions;

      if (pinned) {
        const section = $(".showcase");
        const laptop = $(".laptop");
        const lid = $(".laptop__lid");
        const phone = $(".phone");
        const boxL = $(".laptop__screen");
        const boxP = $(".phone__screen");
        const screensL = $$(".screen", boxL);
        const screensP = $$(".screen", boxP);
        const items = $$(".showcase__item");
        const dots = $$(".showcase__dots span");
        section.classList.add("is-pinned");

        gsap.set(items.slice(1), { autoAlpha: 0 });
        gsap.set([...screensL.slice(1), ...screensP.slice(1)], { clipPath: "inset(100% 0% 0% 0%)" });
        // how far a full-page screenshot must travel to reach its bottom
        const travel = (img, box) => () => -Math.max(0, img.offsetHeight - box.offsetHeight);
        const starts = items.map((_, i) => (i === 0 ? 0 : 1 + i * 2));
        const setActive = (i) => dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
        setActive(0);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => "+=" + window.innerHeight * (items.length + 1),
            pin: true,
            scrub: 0.8,
            refreshPriority: 1,
            invalidateOnRefresh: true,
            onUpdate: () => setActive(starts.findLastIndex((t) => tl.time() >= t)),
          },
        });

        // the laptop opens, the phone slides in
        tl.fromTo(lid, { rotationX: -80 }, { rotationX: 0, duration: 1, ease: "power2.out" }, 0)
          .fromTo(laptop, { scale: 0.86, y: 40 }, { scale: 1, y: 0, duration: 1, ease: "power2.out" }, 0)
          .fromTo(phone, { yPercent: 30, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0.4);

        // each project: wipe in its screens, swap the copy, then scroll the site inside the screens
        const desktopOnly = (k) => items[k].hasAttribute("data-desktop-only");
        items.forEach((item, i) => {
          const at = 1 + i * 2;
          if (i > 0) {
            // the phone steps aside for desktop-only apps
            if (desktopOnly(i) !== desktopOnly(i - 1)) {
              tl.to(phone, { autoAlpha: desktopOnly(i) ? 0 : 1, yPercent: desktopOnly(i) ? 20 : 0, duration: 0.5, ease: "power2.inOut" }, at);
            }
            tl.to(screensL[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "power2.inOut" }, at)
              .to(screensP[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "power2.inOut" }, at + 0.08)
              .to(items[i - 1], { autoAlpha: 0, y: -24, duration: 0.3 }, at)
              .fromTo(item, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, immediateRender: false }, at + 0.3);
          }
          tl.to(screensL[i], { y: travel(screensL[i], boxL), duration: 1.3 }, at + 0.6)
            .to(screensP[i], { y: travel(screensP[i], boxP), duration: 1.3 }, at + 0.6);
        });
        tl.to({}, { duration: 0.4 });

        return () => section.classList.remove("is-pinned");
      }

      if (!motion) return;

      // tablet / mobile: showcase as cards
      gsap.set(".showcase__item", { y: 50, opacity: 0 });
      ScrollTrigger.batch(".showcase__item", {
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
        linesClass: "sline", // mask wrapper becomes .sline-mask (SplitText suffixes every word of the class)
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
    gsap.set(".reveal, .job__card, .project", { y: 40, opacity: 0 });
    ScrollTrigger.batch(".reveal, .job__card, .project", {
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
  const EMAIL = "carreonjoshua47@gmail.com";
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      showToast("Email copied to clipboard ✓");
    } catch (_) {
      window.location.href = `mailto:${EMAIL}`;
    }
  };
  $("#copyEmail").addEventListener("click", copyEmail);

  // ---------- Quick message: opens a ready-to-send email or WhatsApp chat ----------
  const WHATSAPP = "639292622094";
  $("#composer").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const topic = f.get("topic");
    const name = f.get("name").trim();
    const company = f.get("company").trim();
    const from = company ? `${name}, ${company}` : name;
    const body = `Hi Paul,\n\n${f.get("message").trim()}\n\n— ${from}`;
    if (e.submitter?.value === "whatsapp") {
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`[${topic}] ${body}`)}`, "_blank", "noopener");
    } else {
      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`${topic} — ${from}`)}&body=${encodeURIComponent(body)}`;
    }
  });

  // ---------- Quick actions (Ctrl/Cmd + K, or "/") ----------
  const cmdk = $("#cmdk");
  const cmdkInput = $("#cmdkInput");
  const cmdkList = $("#cmdkList");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  $("#cmdkKey").textContent = isMac ? "⌘ K" : "Ctrl K";
  const openUrl = (url) => () => window.open(url, "_blank", "noopener");
  const goTo = (sel) => () => scrollToTarget(sel === "#hero" ? 0 : $(sel));

  const commands = [
    ["Navigate", "fa-solid fa-house", "Home", goTo("#hero")],
    ["Navigate", "fa-solid fa-user", "About", goTo("#about")],
    ["Navigate", "fa-solid fa-laptop-code", "Selected work", goTo("#work")],
    ["Navigate", "fa-solid fa-layer-group", "Skills & tools", goTo("#skills")],
    ["Navigate", "fa-solid fa-briefcase", "Experience", goTo("#experience")],
    ["Navigate", "fa-solid fa-graduation-cap", "Education & certifications", goTo("#credentials")],
    ["Navigate", "fa-solid fa-paper-plane", "Contact", goTo("#contact")],
    ["Actions", "fa-regular fa-copy", "Copy email address", copyEmail, EMAIL],
    ["Actions", "fa-solid fa-file-arrow-down", "Download résumé (PDF)", () => $(".header__cv").click()],
    ["Actions", "fa-solid fa-envelope", "Send me an email", () => (window.location.href = `mailto:${EMAIL}`)],
    ["Live projects", "fa-solid fa-arrow-up-right-from-square", "HR Admin Hub", openUrl("https://hr-admin-hub.vercel.app/"), "hr-admin-hub.vercel.app"],
    ["Live projects", "fa-solid fa-arrow-up-right-from-square", "201 File Sorter", openUrl("https://sorter201.vercel.app/"), "sorter201.vercel.app"],
    ["Live projects", "fa-solid fa-arrow-up-right-from-square", "Realcognita", openUrl("https://www.realcognita.com/"), "realcognita.com"],
    ["Live projects", "fa-solid fa-arrow-up-right-from-square", "Realforma (in development)", openUrl("http://realforma-stg.realcognita.com/"), "realforma-stg.realcognita.com"],
    ["Live projects", "fa-solid fa-arrow-up-right-from-square", "SudsUp — Laundry POS", openUrl("https://laundry-pos-drab.vercel.app/"), "laundry-pos-drab.vercel.app"],
    ["Live projects", "fa-solid fa-arrow-up-right-from-square", "iSmile Dental Home", openUrl("https://ismile.com.ph/"), "ismile.com.ph"],
    ["Profiles", "fab fa-linkedin-in", "LinkedIn", openUrl("https://www.linkedin.com/in/paul-carreon-859b672a2/")],
    ["Profiles", "fab fa-github", "GitHub", openUrl("https://github.com/PaulJoshua0603/")],
    ["Profiles", "fab fa-facebook-f", "Facebook", openUrl("https://www.facebook.com/peejeey/")],
  ].map(([group, icon, label, run, hint]) => ({ group, icon, label, run, hint }));

  let results = [];
  let active = 0;
  const setActiveCmd = (i) => {
    active = i;
    $$(".cmdk__item", cmdkList).forEach((b, k) => b.setAttribute("aria-selected", k === i));
    cmdkInput.setAttribute("aria-activedescendant", `cmdk-${i}`);
    $(`#cmdk-${i}`)?.scrollIntoView({ block: "nearest" });
  };
  const runCmd = (i) => {
    const cmd = results[i];
    if (!cmd) return;
    cmdk.close();
    lenis?.start(); // the dialog's close event fires a tick later; scrolling needs Lenis now
    cmd.run();
  };
  const fold = (t) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(); // "résumé" matches "resume"
  const renderCmds = () => {
    const q = fold(cmdkInput.value.trim());
    results = commands.filter((c) => fold(`${c.label} ${c.group} ${c.hint || ""}`).includes(q));
    active = 0;
    cmdkList.replaceChildren();
    if (!results.length) {
      const empty = document.createElement("p");
      empty.className = "cmdk__empty";
      empty.textContent = "No results — try “email”, “résumé” or a project name.";
      cmdkList.append(empty);
      return;
    }
    let group = "";
    results.forEach((c, i) => {
      if (c.group !== group) {
        group = c.group;
        const g = document.createElement("p");
        g.className = "cmdk__group";
        g.textContent = group;
        cmdkList.append(g);
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cmdk__item";
      b.id = `cmdk-${i}`;
      b.setAttribute("role", "option");
      const icon = document.createElement("i");
      icon.className = c.icon;
      const label = document.createElement("span");
      label.textContent = c.label;
      b.append(icon, label);
      if (c.hint) {
        const hint = document.createElement("small");
        hint.textContent = c.hint;
        b.append(hint);
      }
      b.addEventListener("click", () => runCmd(i));
      b.addEventListener("pointermove", () => active !== i && setActiveCmd(i));
      cmdkList.append(b);
    });
    setActiveCmd(0);
  };
  const openCmdk = () => {
    if (cmdk.open) return;
    cmdkInput.value = "";
    renderCmds();
    cmdk.showModal();
    lenis?.stop();
    cmdkInput.focus();
    if (!reduceMotion) gsap.fromTo(cmdk, { y: -12, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" });
  };

  cmdkInput.addEventListener("input", renderCmds);
  cmdkInput.addEventListener("keydown", (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveCmd((active + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveCmd((active - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); runCmd(active); }
  });
  cmdk.addEventListener("click", (e) => e.target === cmdk && cmdk.close());
  cmdk.addEventListener("close", () => lenis?.start());
  $("#cmdkOpen").addEventListener("click", openCmdk);
  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      cmdk.open ? cmdk.close() : openCmdk();
    } else if (e.key === "/" && !typing && !cmdk.open) {
      e.preventDefault();
      openCmdk();
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
