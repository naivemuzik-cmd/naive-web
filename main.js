(() => {
  const root = document.documentElement;
  const nav = document.getElementById("nav");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Foto de fondo + barra: siguen el scroll de la portada ---
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const p = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.9), 0), 1);
      root.style.setProperty("--p", p.toFixed(3));
      nav.classList.toggle("scrolled", window.scrollY > 10);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // --- Menú en celular ---
  const menuBtn = document.getElementById("nav-menu");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "CLOSE" : "MENU";
  });
  document.querySelectorAll("#nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.textContent = "MENU";
    })
  );

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

  // --- Carruseles de live sets ---
  const DURATION = 6000;
  document.querySelectorAll("[data-carousel]").forEach((carousel, ci) => {
    const slides = [...carousel.querySelectorAll(".slide")];
    const barsBox = carousel.querySelector(".bars");
    let index = 0;
    let timer = null;
    let remaining = DURATION;
    let startedAt = 0;

    const bars = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bar";
      b.setAttribute("aria-label", `Set ${i + 1}`);
      b.innerHTML = "<span></span>";
      b.addEventListener("click", () => go(i));
      barsBox.appendChild(b);
      return b;
    });
    carousel.style.setProperty("--dur", DURATION + "ms");

    function paint() {
      slides.forEach((s, i) => {
        s.classList.toggle("is-active", i === index);
        s.tabIndex = i === index ? 0 : -1;
      });
      bars.forEach((b, i) => {
        b.classList.toggle("done", i < index);
        b.classList.remove("active");
      });
      void bars[index].offsetWidth; // reinicia la animación de la barra
      bars[index].classList.add("active");
    }
    function schedule(ms) {
      clearTimeout(timer);
      if (reduceMotion) return;
      startedAt = Date.now();
      remaining = ms;
      timer = setTimeout(() => go((index + 1) % slides.length), ms);
    }
    function go(i) {
      index = i;
      paint();
      schedule(DURATION);
    }
    function pause() {
      if (carousel.classList.contains("paused")) return;
      clearTimeout(timer);
      remaining -= Date.now() - startedAt;
      carousel.classList.add("paused");
    }
    function resume() {
      if (!carousel.classList.contains("paused")) return;
      carousel.classList.remove("paused");
      schedule(Math.max(remaining, 300));
    }

    carousel.addEventListener("mouseenter", pause);
    carousel.addEventListener("mouseleave", resume);
    carousel.addEventListener("focusin", pause);
    carousel.addEventListener("focusout", resume);

    paint();
    // el segundo carrusel arranca desfasado para que no cambien a la vez
    setTimeout(() => schedule(DURATION), ci * 1500);
  });

  // --- Bio completa ---
  document.querySelectorAll("[data-bio]").forEach((btn) =>
    btn.addEventListener("click", () => document.getElementById(btn.dataset.bio).showModal())
  );
  document.querySelectorAll(".bio-dialog").forEach((dlg) => {
    dlg.querySelector(".dialog-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
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
