(() => {
  const root = document.documentElement;
  const nav = document.getElementById("nav");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollTimeline = window.CSS && CSS.supports("animation-timeline: view()");

  // --- Entrada de la portada: las letras aparecen cuando la tipografía ya cargó ---
  const showHero = () => root.classList.add("ready");
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(() => requestAnimationFrame(showHero));

  // --- Foto de fondo, barra y progreso siguen el scroll ---
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const p = Math.min(Math.max(y / (window.innerHeight * 0.9), 0), 1);
      root.style.setProperty("--p", p.toFixed(3));
      nav.classList.toggle("scrolled", y > 10);
      if (!scrollTimeline) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        nav.style.setProperty("--progress", max > 0 ? (y / max).toFixed(4) : 0);
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // --- Menú en celular ---
  const menuBtn = document.getElementById("nav-menu");
  const closeMenu = () => {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "MENU";
  };
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "CLOSE" : "MENU";
  });
  document.querySelectorAll("#nav-links a").forEach((a) => a.addEventListener("click", closeMenu));

  // --- Sección activa en la barra ---
  const links = new Map([...document.querySelectorAll("#nav-links a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a, id) => a.classList.toggle("active", id === e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  // --- Aparición al hacer scroll (solo si el navegador no lo hace con CSS) ---
  if (!scrollTimeline && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
  }

  // --- Carrusel de temas (flechas, vuelve al principio al llegar al final) ---
  const releases = document.getElementById("releases");
  document.querySelectorAll(".arrow").forEach((btn) =>
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.dir);
      const step = releases.clientWidth / 2;
      const max = releases.scrollWidth - releases.clientWidth - 2;
      let target = releases.scrollLeft + dir * step;
      if (dir > 0 && releases.scrollLeft >= max) target = 0;
      if (dir < 0 && releases.scrollLeft <= 2) target = max;
      releases.scrollTo({ left: target, behavior: reduceMotion ? "auto" : "smooth" });
    })
  );

  // --- Filtro de live sets (con transición animada si el navegador la soporta) ---
  const chips = document.querySelectorAll(".chip");
  const sets = [...document.querySelectorAll(".set")];
  sets.forEach((s, i) => { s.style.viewTransitionName = "set-" + i; });
  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      const apply = () => {
        chips.forEach((c) => {
          const on = c === chip;
          c.classList.toggle("is-on", on);
          c.setAttribute("aria-pressed", String(on));
        });
        sets.forEach((s) => { s.hidden = f !== "all" && s.dataset.platform !== f; });
      };
      if (document.startViewTransition && !reduceMotion) document.startViewTransition(apply);
      else apply();
    })
  );

  // --- Reproductor: YouTube, SoundCloud y Spotify adentro de la web ---
  const player = document.getElementById("player");
  const frame = document.getElementById("player-frame");
  const pTitle = document.getElementById("player-title");
  const pExt = document.getElementById("player-ext");
  const scSrc = (url, extra) =>
    "https://w.soundcloud.com/player/?url=" + encodeURIComponent(url) +
    "&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false" + extra;

  function embedFor(el) {
    const kind = el.dataset.embed;
    if (kind === "youtube") {
      const start = el.dataset.start ? "&start=" + el.dataset.start : "";
      return { kind, src: `https://www.youtube-nocookie.com/embed/${el.dataset.id}?autoplay=1&rel=0&playsinline=1${start}`, label: "Abrir en YouTube ↗" };
    }
    if (kind === "soundcloud") return { kind, src: scSrc(el.dataset.url, "&visual=true"), label: "Abrir en SoundCloud ↗" };
    if (kind === "spotify") return { kind, src: `https://open.spotify.com/embed/${el.dataset.type}/${el.dataset.id}?utm_source=generator&theme=0`, label: "Abrir en Spotify ↗" };
    return null;
  }

  document.querySelectorAll("[data-embed]").forEach((el) =>
    el.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // dejar abrir en pestaña nueva
      const emb = embedFor(el);
      if (!emb || !player.showModal) return;
      e.preventDefault();
      player.className = "modal player is-" + emb.kind + (el.dataset.type === "track" ? " is-track" : "");
      pTitle.textContent = el.dataset.title || "";
      pExt.href = el.href;
      pExt.textContent = emb.label;
      frame.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.src = emb.src;
      iframe.title = el.dataset.title || "Reproductor";
      iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write";
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
      player.showModal();
    })
  );
  player.addEventListener("close", () => { frame.innerHTML = ""; });

  // --- Highlights de la bio: el reproductor de SoundCloud se carga recién al tocar play ---
  document.querySelectorAll(".sc-facade").forEach((btn) =>
    btn.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.className = "sc-player";
      iframe.src = scSrc(btn.dataset.url, "&visual=false");
      iframe.title = btn.querySelector(".sc-facade-title").textContent;
      iframe.allow = "autoplay";
      btn.replaceWith(iframe);
    })
  );

  // --- Bio completa ---
  document.querySelectorAll("[data-bio]").forEach((btn) =>
    btn.addEventListener("click", () => document.getElementById(btn.dataset.bio).showModal())
  );
  document.querySelectorAll(".modal").forEach((dlg) => {
    dlg.querySelector(".dialog-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => {
      const r = dlg.getBoundingClientRect();
      const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (e.target === dlg && outside) dlg.close();
    });
  });

  // --- Copiar email ---
  const toast = document.getElementById("toast");
  let toastTimer;
  document.querySelectorAll("[data-copy]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        toast.textContent = "Email copiado";
      } catch {
        toast.textContent = text;
      }
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
    })
  );

  document.getElementById("year").textContent = new Date().getFullYear();
})();
