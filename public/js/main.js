"use strict";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileQuery = window.matchMedia("(max-width: 860px)");

document.documentElement.classList.add("js");

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector(".nav-toggle");
const menu = document.getElementById("site-menu");

function syncMenu() {
  if (!menu || !("inert" in menu)) return;
  const open = nav?.classList.contains("nav-open");
  menu.inert = mobileQuery.matches && !open;
}

function setMenu(open) {
  if (!nav || !toggle) return;
  nav.classList.toggle("nav-open", open);
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  syncMenu();
}

toggle?.addEventListener("click", () => {
  setMenu(!nav.classList.contains("nav-open"));
});

menu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

mobileQuery.addEventListener("change", () => {
  if (!mobileQuery.matches) setMenu(false);
  else syncMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav?.classList.contains("nav-open")) {
    setMenu(false);
    toggle?.focus();
  }
});

syncMenu();

const progress = document.querySelector(".progress span");
const parallax = document.querySelector(".hero-parallax");
const hero = document.querySelector(".hero");

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  nav?.classList.toggle("is-solid", y > 24);
}

let ticking = false;
onScroll();
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    onScroll();
    ticking = false;
  });
}, { passive: true });

if (!reduceMotion && parallax && hero && window.matchMedia("(pointer: fine)").matches) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    parallax.style.transform = `translate3d(${(x * -8).toFixed(2)}px, ${(y * -6).toFixed(2)}px, 0)`;
  });
  hero.addEventListener("pointerleave", () => {
    parallax.style.transform = "";
  });
}

const reveals = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -10% 0px" });
  reveals.forEach((el) => observer.observe(el));
}

const navLinks = [...document.querySelectorAll(".nav-links a")];
const spyTargets = navLinks
  .map((link) => {
    const id = link.getAttribute("href");
    const section = id?.startsWith("#") ? document.querySelector(id) : null;
    return section ? { link, section } : null;
  })
  .filter(Boolean);

if (spyTargets.length && "IntersectionObserver" in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const current = spyTargets.find((item) => item.section === entry.target);
      navLinks.forEach((link) => link.removeAttribute("aria-current"));
      current?.link.setAttribute("aria-current", "true");
    });
  }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
  spyTargets.forEach((item) => spy.observe(item.section));
}

document.querySelectorAll(".shot img, .room-card img").forEach((img) => {
  const mark = () => img.classList.add("is-loaded");
  if (img.complete) mark();
  else {
    img.addEventListener("load", mark, { once: true });
    img.addEventListener("error", mark, { once: true });
  }
});

const dialog = document.getElementById("lightbox");
const lightboxImage = dialog?.querySelector("img");
const lightboxCaption = dialog?.querySelector(".lightbox-caption");
const shots = [...document.querySelectorAll(".shot button")];
let shotIndex = 0;
let opener = null;

function showShot(index) {
  if (!shots.length || !dialog || !lightboxImage || typeof dialog.showModal !== "function") return;
  shotIndex = (index + shots.length) % shots.length;
  const button = shots[shotIndex];
  const source = button.querySelector("img");
  lightboxImage.src = source?.currentSrc || source?.src || "";
  lightboxImage.alt = source?.alt || "";
  if (lightboxCaption) {
    const caption = button.closest("figure")?.querySelector("figcaption");
    lightboxCaption.textContent = caption?.textContent?.trim() || "";
  }
  if (!dialog.open) {
    opener = button;
    dialog.showModal();
  }
}

if (dialog && typeof dialog.showModal === "function") {
  shots.forEach((button, index) => {
    button.addEventListener("click", () => showShot(index));
  });
  dialog.querySelector("[data-lightbox-close]")?.addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => showShot(shotIndex - 1));
  dialog.querySelector("[data-lightbox-next]")?.addEventListener("click", () => showShot(shotIndex + 1));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    lightboxImage?.removeAttribute("src");
    opener?.focus();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showShot(shotIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      showShot(shotIndex - 1);
    }
  });

  let touchStartX = null;
  dialog.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  dialog.addEventListener("touchend", (event) => {
    if (touchStartX == null) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 48) showShot(shotIndex + (delta < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });
}
