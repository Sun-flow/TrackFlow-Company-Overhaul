// Home page hero snap: while the full-screen hero is in view, one scroll gesture (wheel, swipe or key)
// glides straight to #services, and one gesture back up from there returns to the top. Below Services
// the page scrolls normally. The glide is short and fixed (GLIDE ms) and scrolling is free again as soon
// as it lands, so a reader who keeps scrolling carries straight on. It is instant for users who prefer
// reduced motion. If the hero doesn't fit the screen (a short landscape window), the snap is off so
// nothing in the hero is skipped.
document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector("[data-hero-snap]");
  const services = document.getElementById("services");
  const header = document.querySelector("body > header");
  if (!hero || !services || !header) return;

  const SLACK = 2; // px of rounding to ignore when comparing scroll positions
  const GLIDE = 350; // ms the glide takes
  const SETTLE = 120; // ms after landing that a wheel gesture's leftover momentum is still swallowed
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let gliding = false;
  let landedAt = -Infinity;
  let touchY = null;
  let touchSnapped = false;

  // Where the page rests when Services sits right under the sticky header (its scroll-mt).
  const servicesTop = () =>
    services.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(services).scrollMarginTop);
  const heroFits = () => hero.offsetHeight <= window.innerHeight - header.offsetHeight + SLACK;

  // Which way a gesture should snap from the current position, or null to scroll normally.
  const snapFor = (down) => {
    if (!heroFits()) return null;
    const y = window.scrollY;
    const target = servicesTop();
    if (down && y < target - SLACK) return "services";
    if (!down && y > SLACK && y <= target + SLACK) return "top";
    return null;
  };

  // Our own eased animation rather than the browser's smooth scroll, whose length varies by browser
  // and distance: this one always ends after GLIDE ms. "instant" bypasses the page's scroll-smooth.
  const glide = (to) => {
    const from = window.scrollY;
    const target = to === "services" ? servicesTop() : 0;
    const land = () => {
      gliding = false;
      landedAt = performance.now();
    };
    if (reducedMotion.matches) {
      window.scrollTo({ top: target, behavior: "instant" });
      land();
      return;
    }
    gliding = true;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / GLIDE, 1);
      const eased = 1 - (1 - t) ** 3; // cubic, fast start and soft landing
      window.scrollTo({ top: from + (target - from) * eased, behavior: "instant" });
      if (t < 1) requestAnimationFrame(step);
      else land();
    };
    requestAnimationFrame(step);
  };

  // True while a snap is moving or has only just landed, so the flick that caused it can't overshoot.
  const settling = () => gliding || performance.now() - landedAt < SETTLE;

  // A scroll that comes to rest part-way through the hero (a dragged scrollbar, or swipe momentum
  // carried up from Services) finishes the move in the direction it was going.
  let lastY = window.scrollY;
  let lastDown = true;
  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY !== lastY) lastDown = window.scrollY > lastY;
      lastY = window.scrollY;
    },
    { passive: true },
  );
  window.addEventListener("scrollend", () => {
    if (gliding || touchY !== null || !heroFits()) return;
    const y = window.scrollY;
    if (y > SLACK && y < servicesTop() - SLACK) glide(lastDown ? "services" : "top");
  });

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.deltaY === 0) return; // pinch zoom, sideways scroll
      if (settling()) {
        event.preventDefault();
        return;
      }
      const to = snapFor(event.deltaY > 0);
      if (!to) return;
      event.preventDefault();
      glide(to);
    },
    { passive: false },
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
      touchSnapped = false;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (touchY === null) return;
      if (touchSnapped || gliding) {
        event.preventDefault();
        return;
      }
      const dy = touchY - event.touches[0].clientY; // positive when the finger moves up (page scrolls down)
      if (dy === 0) return;
      const to = snapFor(dy > 0);
      if (!to) return;
      event.preventDefault();
      if (Math.abs(dy) < 10) return; // wait for a clear direction before snapping
      touchSnapped = true;
      glide(to);
    },
    { passive: false },
  );

  window.addEventListener("touchend", () => {
    touchY = null;
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("input, textarea, select, button, [contenteditable]")) return;
    const downKeys = ["ArrowDown", "PageDown"];
    const upKeys = ["ArrowUp", "PageUp"];
    let down;
    if (downKeys.includes(event.key) || (event.key === " " && !event.shiftKey)) down = true;
    else if (upKeys.includes(event.key) || (event.key === " " && event.shiftKey)) down = false;
    else return;
    if (gliding) {
      event.preventDefault();
      return;
    }
    const to = snapFor(down);
    if (!to) return;
    event.preventDefault();
    glide(to);
  });
});
