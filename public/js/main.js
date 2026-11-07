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
const scroller = dialog?.querySelector("[data-lightbox-scroll]");
const rail = dialog?.querySelector("[data-lightbox-rail]");
const shots = [...document.querySelectorAll(".shot button")];
let opener = null;
let adjusting = false;
let railIndex = -1;
let railTarget = 0;
let railFrame = 0;
let railDriven = false;
let committedTop = 0;
let driving = false;
const hasScrollEnd = "onscrollend" in window;

function slideFrom(button) {
  const source = button.querySelector("img");
  const caption = button.closest("figure")?.querySelector("figcaption");
  const slide = document.createElement("figure");
  slide.className = "lightbox-slide";
  const img = document.createElement("img");
  img.alt = source?.alt || "";
  img.decoding = "async";
  img.loading = "lazy";
  if (source?.getAttribute("width")) img.width = Number(source.getAttribute("width"));
  if (source?.getAttribute("height")) img.height = Number(source.getAttribute("height"));
  const altKey = source?.getAttribute("data-i18n");
  if (altKey) {
    img.setAttribute("data-i18n", altKey);
    img.setAttribute("data-i18n-attr", "alt");
  }
  img.src = source?.getAttribute("src") || "";
  const cap = document.createElement("figcaption");
  cap.textContent = caption?.textContent?.trim() || "";
  const capKey = caption?.getAttribute("data-i18n");
  if (capKey) cap.setAttribute("data-i18n", capKey);
  slide.append(img, cap);
  return slide;
}

function buildScroller() {
  if (!scroller || scroller.childElementCount) return;
  const frag = document.createDocumentFragment();
  for (let copy = 0; copy < 3; copy += 1) {
    shots.forEach((button) => frag.append(slideFrom(button)));
  }
  scroller.append(frag);
  if (!rail || rail.childElementCount) return;
  const thumbs = document.createDocumentFragment();
  shots.forEach((button, index) => {
    const source = button.querySelector("img");
    const caption = button.closest("figure")?.querySelector("figcaption");
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.dataset.index = String(index);
    const label = caption?.textContent?.trim() || source?.alt || "";
    if (label) thumb.setAttribute("aria-label", label);
    const capKey = caption?.getAttribute("data-i18n");
    if (capKey) {
      thumb.setAttribute("data-i18n", capKey);
      thumb.setAttribute("data-i18n-attr", "aria-label");
    }
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    const full = source?.getAttribute("src") || "";
    const file = full.split("/").pop() || "";
    const preview = file ? `images/thumbs/${file.replace(/\.[^.]+$/, "")}.jpg?v=floor4` : "";
    img.src = preview || full;
    if (preview && full) {
      img.addEventListener("error", () => {
        if (img.dataset.full === "1") return;
        img.dataset.full = "1";
        img.src = full;
      }, { once: true });
    }
    thumb.append(img);
    thumbs.append(thumb);
  });
  rail.append(thumbs);
}

function warmAround(index) {
  const count = shots.length;
  const slides = scroller.children;
  for (let copy = 0; copy < 3; copy += 1) {
    for (let offset = -1; offset <= 1; offset += 1) {
      const img = slides[copy * count + ((index + offset + count) % count)]?.querySelector("img");
      if (img && img.loading !== "eager") img.loading = "eager";
    }
  }
}

function stepRail() {
  if (railDriven) {
    railFrame = 0;
    return;
  }
  const diff = railTarget - rail.scrollTop;
  if (Math.abs(diff) < 0.6) {
    rail.scrollTop = railTarget;
    railFrame = 0;
    return;
  }
  rail.scrollTop += diff * 0.18;
  railFrame = requestAnimationFrame(stepRail);
}

function moveRail(index, immediate) {
  const active = rail.querySelectorAll("button")[index];
  if (!active) return;
  const railBox = rail.getBoundingClientRect();
  const box = active.getBoundingClientRect();
  const margin = 16;
  let delta = 0;
  if (box.top < railBox.top + margin) delta = box.top - (railBox.top + margin);
  else if (box.bottom > railBox.bottom - margin) delta = box.bottom - (railBox.bottom - margin);
  const max = Math.max(0, rail.scrollHeight - rail.clientHeight);
  railTarget = Math.max(0, Math.min(max, rail.scrollTop + delta));
  if (immediate || reduceMotion || railDriven) {
    cancelAnimationFrame(railFrame);
    railFrame = 0;
    if (!railDriven) rail.scrollTop = railTarget;
    return;
  }
  if (!railFrame) {
    if (Math.abs(railTarget - rail.scrollTop) < 1) return;
    railFrame = requestAnimationFrame(stepRail);
  }
}

function syncRail(immediate = false) {
  if (!rail || !scroller) return;
  const height = scroller.clientHeight;
  if (!height || !shots.length) return;
  const index = ((Math.round(scroller.scrollTop / height) % shots.length) + shots.length) % shots.length;
  if (index === railIndex) return;
  railIndex = index;
  warmAround(index);
  rail.querySelectorAll("button").forEach((button, i) => {
    const on = i === index;
    button.classList.toggle("is-active", on);
    if (on) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
  moveRail(index, immediate);
}

function recenter() {
  if (!scroller) return;
  const height = scroller.clientHeight;
  const count = shots.length;
  if (!height || !count) return;
  const set = count * height;
  const index = Math.round(scroller.scrollTop / height);
  if (Math.abs(scroller.scrollTop - index * height) > 2) return;
  let shift = 0;
  if (index < count) shift = set;
  else if (index >= count * 2) shift = -set;
  if (!shift) return;
  adjusting = true;
  scroller.scrollTop += shift;
  committedTop += shift;
  requestAnimationFrame(() => { adjusting = false; });
}

function goBy(steps, behavior) {
  const height = scroller.clientHeight;
  const count = shots.length;
  if (!scroller || !height || !count || !steps) return;
  const set = count * height;
  const max = Math.max(0, scroller.scrollHeight - height);
  let top = committedTop + steps * height;
  if (top < 0) {
    adjusting = true;
    committedTop += set;
    top += set;
    scroller.scrollTop += set;
    adjusting = false;
  } else if (top > max) {
    adjusting = true;
    committedTop -= set;
    top -= set;
    scroller.scrollTop -= set;
    adjusting = false;
  }
  committedTop = top;
  const smooth = behavior === "smooth" && !reduceMotion;
  driving = smooth;
  scroller.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  if (!smooth) {
    recenter();
    railIndex = -1;
    syncRail(true);
  }
}

function finishScroll() {
  if (!dialog?.open || adjusting) return;
  const height = scroller.clientHeight;
  if (!height) return;
  if (driving) {
    if (Math.abs(scroller.scrollTop - committedTop) > 2) {
      scroller.scrollTo({ top: committedTop, behavior: "auto" });
      return;
    }
    driving = false;
    recenter();
    railIndex = -1;
    syncRail();
    return;
  }
  const traveled = scroller.scrollTop - committedTop;
  if (Math.abs(traveled) < 48) {
    if (Math.abs(traveled) > 1) {
      driving = true;
      scroller.scrollTo({ top: committedTop, behavior: reduceMotion ? "auto" : "smooth" });
    }
    return;
  }
  const steps = Math.sign(traveled) * Math.max(1, Math.round(Math.abs(traveled) / height));
  goBy(steps, reduceMotion ? "auto" : "smooth");
}

function scrollToShot(button) {
  if (!scroller) return;
  const index = shots.indexOf(button);
  const height = scroller.clientHeight;
  if (index < 0 || !height) return;
  committedTop = (shots.length + index) * height;
  driving = false;
  scroller.scrollTo({ top: committedTop, behavior: "auto" });
}

function openLightbox(button, returnFocus) {
  if (!button || !dialog || typeof dialog.showModal !== "function" || !shots.includes(button)) return;
  buildScroller();
  opener = returnFocus || button;
  if (!dialog.open) dialog.showModal();
  railIndex = -1;
  scrollToShot(button);
  syncRail(true);
  requestAnimationFrame(() => {
    scrollToShot(button);
    railIndex = -1;
    syncRail(true);
  });
}

if (dialog && scroller && typeof dialog.showModal === "function") {
  document.querySelectorAll(".shot button").forEach((button) => {
    if (button.closest(".room-source")) return;
    button.addEventListener("click", () => openLightbox(button, button));
  });
  dialog.querySelector("[data-lightbox-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => opener?.focus());
  scroller.addEventListener("click", (event) => {
    if (event.target === scroller || event.target.classList.contains("lightbox-slide")) dialog.close();
  });
  rail?.addEventListener("click", (event) => {
    const thumb = event.target.closest("button");
    if (!thumb || !rail.contains(thumb)) return;
    const index = Number(thumb.dataset.index);
    if (!Number.isInteger(index) || !shots[index]) return;
    scrollToShot(shots[index]);
    railIndex = -1;
    syncRail(true);
  });
  if (rail) {
    let railHold = 0;
    const pauseRail = () => {
      railDriven = true;
      cancelAnimationFrame(railFrame);
      railFrame = 0;
    };
    const resumeRail = () => { railDriven = false; };
    rail.addEventListener("pointerdown", () => {
      pauseRail();
      const stop = () => {
        resumeRail();
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    });
    rail.addEventListener("wheel", () => {
      pauseRail();
      clearTimeout(railHold);
      railHold = setTimeout(resumeRail, 220);
    }, { passive: true });
    scroller.addEventListener("pointerdown", resumeRail);
    scroller.addEventListener("wheel", resumeRail, { passive: true });
  }
  scroller.addEventListener("scroll", () => {
    if (!adjusting) syncRail();
  }, { passive: true });
  if (hasScrollEnd) scroller.addEventListener("scrollend", finishScroll);
  else {
    scroller.addEventListener("scroll", () => {
      clearTimeout(scroller.settleTimer);
      scroller.settleTimer = setTimeout(finishScroll, 140);
    }, { passive: true });
  }
  dialog.addEventListener("keydown", (event) => {
    const next = event.key === "ArrowDown" || event.key === "ArrowRight";
    const prev = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!next && !prev) return;
    event.preventDefault();
    goBy(next ? 1 : -1, event.repeat ? "auto" : "smooth");
  });
  window.addEventListener("resize", () => {
    if (!dialog.open) return;
    const height = scroller.clientHeight;
    if (!height) return;
    const index = Math.round(scroller.scrollTop / height) % shots.length;
    scrollToShot(shots[index]);
  });
}

document.querySelectorAll("[data-room-open]").forEach((card) => {
  card.addEventListener("click", () => {
    const id = card.getAttribute("data-room-open");
    const source = id ? document.getElementById(id) : null;
    const buttons = source ? [...source.querySelectorAll(".shot button")] : [];
    if (!buttons.length) return;
    const preview = card.querySelector("img")?.getAttribute("src");
    const match = buttons.find((button) => button.querySelector("img")?.getAttribute("src") === preview);
    openLightbox(match || buttons[0], card);
  });
});

const loanForm = document.getElementById("loan-calculator");
if (loanForm) {
  const price = 7495000;
  const monthlyFee = 7550;
  const powerMonth = 29000 / 12;
  const insuranceMonth = 6000 / 12;
  const otherMonth = powerMonth + insuranceMonth;
  const minimumDeposit = Math.round(price * 0.05);
  const mortgageCap = price * 0.9;
  const kronor = new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
  const grouped = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
  const depositInput = document.getElementById("deposit");
  const salaryInput = document.getElementById("salary");
  const rateInput = document.getElementById("rate");

  function readMoney(input) {
    const digits = input.value.replace(/\D/g, "");
    if (!digits) return 0;
    const value = Number(digits);
    return Number.isFinite(value) ? value : 0;
  }

  function formatMoneyInput(input) {
    const digits = input.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    const next = digits ? grouped.format(Number(digits)) : "";
    if (next === input.value) return;
    const focused = document.activeElement === input;
    const caret = input.selectionStart ?? 0;
    const digitsBefore = input.value.slice(0, caret).replace(/\D/g, "").length;
    input.value = next;
    if (!focused) return;
    let seen = 0;
    let pos = next.length;
    if (digitsBefore === 0) {
      pos = 0;
    } else {
      for (let i = 0; i < next.length; i += 1) {
        if (/\d/.test(next[i])) seen += 1;
        if (seen >= digitsBefore) {
          pos = i + 1;
          break;
        }
      }
    }
    input.setSelectionRange(pos, pos);
  }

  function write(name, text) {
    const node = document.querySelector(`[data-out="${name}"]`);
    if (node) node.textContent = text;
  }

  function updateLoan() {
    const deposit = readMoney(depositInput);
    const monthlySalary = readMoney(salaryInput);
    const yearlySalary = monthlySalary * 12;
    const rateRaw = rateInput.value.trim();
    const rate = rateRaw === "" ? Number.NaN : Number(rateRaw);
    const requested = price - deposit;
    const withinCap = deposit >= price * 0.1 && deposit <= price;
    const mortgage = Math.min(Math.max(requested, 0), mortgageCap);
    const ltv = mortgage / price;
    const amortRate = ltv > 0.7 ? 0.02 : ltv > 0.5 ? 0.01 : 0;
    const interest = Number.isFinite(rate) && rate >= 0 ? mortgage * (rate / 100) / 12 : 0;
    const amortization = mortgage * amortRate / 12;
    const total = interest + amortization + monthlyFee + otherMonth;
    const yearlyInterest = interest * 12;
    const fullRelief = Math.min(yearlyInterest, 100000);
    const restRelief = Math.max(0, yearlyInterest - 100000);
    const interestAfterTax = (yearlyInterest - (fullRelief * 0.3 + restRelief * 0.21)) / 12;
    const afterTax = interestAfterTax + amortization + monthlyFee + otherMonth;

    if (deposit < minimumDeposit) {
      write("status", t("loan.depositMin", { amount: kronor.format(minimumDeposit) }));
    } else if (deposit > price) {
      write("status", t("loan.depositHigh"));
    } else if (!withinCap) {
      const outside = price * 0.1 - deposit;
      write("status", t("loan.outside", { cap: kronor.format(mortgageCap), outside: kronor.format(outside) }));
    } else {
      write("status", t("loan.within"));
    }

    if (monthlySalary > 0 && mortgage > 0) {
      const multiple = mortgage / yearlySalary;
      const shown = multiple.toLocaleString("sv-SE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
      const guide = multiple > 4.5 ? t("loan.guideHigh") : t("loan.guideOk");
      write("income", t("loan.income", {
        monthly: kronor.format(monthlySalary),
        yearly: kronor.format(yearlySalary),
        multiple: shown,
        guide,
      }));
    } else {
      write("income", t("loan.incomeEmpty"));
    }

    const amortText = amortRate === 0
      ? t("loan.amortNone")
      : t("loan.amort", { amount: kronor.format(amortization), percent: amortRate * 100 });
    write("mortgage", t("loan.mortgage", { amount: kronor.format(mortgage) }));
    write("interest", Number.isFinite(rate) && rate >= 0 ? kronor.format(interest) : t("loan.addRate"));
    write("amort", amortText);
    write("power", kronor.format(powerMonth));
    write("insurance", kronor.format(insuranceMonth));
    write("other", kronor.format(otherMonth));
    write("total", kronor.format(total));
    write("after-tax", Number.isFinite(rate) && rate >= 0 ? kronor.format(afterTax) : t("loan.addRate"));
  }

  [depositInput, salaryInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => formatMoneyInput(input));
    formatMoneyInput(input);
  });
  loanForm.addEventListener("input", updateLoan);
  loanForm.addEventListener("change", updateLoan);
  updateLoan();
  document.addEventListener("languagechange", updateLoan);
}
