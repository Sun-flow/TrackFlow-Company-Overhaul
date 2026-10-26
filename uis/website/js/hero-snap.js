// Home page hero snap: while the full-screen hero is in view, one scroll gesture (wheel, swipe or key)
// glides straight to #services, and one gesture back up from there returns to the top. Below Services
// the page scrolls normally. The glide follows the page's CSS scroll-behavior, so it is instant for
// users who prefer reduced motion. If the hero doesn't fit the screen (a short landscape window), the
// snap is off so nothing in the hero is skipped.
document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector("[data-hero-snap]");
  const services = document.getElementById("services");
  const header = document.querySelector("body > header");
  if (!hero || !services || !header) return;

  const SLACK = 2; // px of rounding to ignore when comparing scroll positions
  const QUIET = 200; // ms without wheel events that ends a gesture's momentum
  const MAX_GLIDE = 1000; // ms fallback where scrollend isn't supported

  let gliding = false;
  let absorbing = false; // swallow the rest of a wheel gesture (trackpad momentum) after a snap
  let lastAbsorbed = 0;
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

  const glide = (to) => {
    gliding = true;
    absorbing = true;
    lastAbsorbed = performance.now();
    let timer;
    const done = () => {
      gliding = false;
      clearTimeout(timer);
      window.removeEventListener("scrollend", done);
    };
    timer = setTimeout(done, MAX_GLIDE);
    window.addEventListener("scrollend", done);
    if (to === "services") services.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
  };

  // True while a snap is still settling, so the gesture that caused it can't scroll past it.
  const settling = () => gliding || (absorbing && performance.now() - lastAbsorbed < QUIET);

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
        lastAbsorbed = performance.now();
        return;
      }
      absorbing = false;
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
