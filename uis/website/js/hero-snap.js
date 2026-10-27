// Home page hero snap: while the full-screen hero is in view, one scroll gesture (wheel, swipe or key)
// glides straight to #services, and one gesture back up from there returns to the top. Below Services
// the page scrolls normally. The glide is short and fixed (GLIDE ms), and the reader gets control back
// for its last stretch (HANDBACK): a fresh scroll, swipe or key there takes over from the glide. After
// it lands only the dying momentum of the flick that started it is held back, so there is no pause.
// It is instant for users who prefer reduced motion. If the hero doesn't fit the screen (a short
// landscape window), the snap is off so nothing in the hero is skipped.
document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector("[data-hero-snap]");
  const services = document.getElementById("services");
  const header = document.querySelector("body > header");
  if (!hero || !services || !header) return;

  const SLACK = 2; // px of rounding to ignore when comparing scroll positions
  const GLIDE = 300; // ms the glide takes
  const HANDBACK = 0.7; // share of the glide after which fresh input takes over
  const GESTURE_GAP = 80; // ms between wheel events that means the earlier gesture has ended
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let gliding = false;
  let glideStart = 0;
  let glideId = 0; // bumped to cancel a running glide
  // After a snap, a trackpad keeps sending the flick's momentum as wheel events that get smaller one by one.
  // Those are held back so they don't carry the page past Services; an event as big as the last one or
  // bigger is the reader pushing again, and ends the hold.
  let holdingMomentum = false;
  let lastWheelAt = -Infinity;
  let lastWheelSize = 0;
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
  const stopGlide = () => {
    glideId += 1;
    gliding = false;
    holdingMomentum = false;
  };
  const inHandback = () => gliding && performance.now() - glideStart > GLIDE * HANDBACK;

  const glide = (to) => {
    const from = window.scrollY;
    const target = to === "services" ? servicesTop() : 0;
    const land = () => {
      gliding = false;
      holdingMomentum = true;
    };
    if (reducedMotion.matches) {
      window.scrollTo({ top: target, behavior: "instant" });
      land();
      return;
    }
    gliding = true;
    glideStart = performance.now();
    const id = ++glideId;
    const step = (now) => {
      if (id !== glideId) return; // cancelled
      const t = Math.min((now - glideStart) / GLIDE, 1);
      // Cubic in-and-out: it stops moving right as the glide ends, with no long slow tail that would
      // look like it had arrived while input was still held.
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2;
      window.scrollTo({ top: from + (target - from) * eased, behavior: "instant" });
      if (t < 1) requestAnimationFrame(step);
      else land();
    };
    requestAnimationFrame(step);
  };

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
      const now = performance.now();
      const size = Math.abs(event.deltaY);
      // A new gesture, or the reader pushing harder, rather than momentum dying away.
      const fresh =
        now - lastWheelAt > GESTURE_GAP || size > lastWheelSize || (size === lastWheelSize && size >= 10);
      lastWheelAt = now;
      lastWheelSize = size;
      if (gliding) {
        if (fresh && inHandback()) stopGlide(); // let this event scroll the page as usual
        else event.preventDefault();
        return;
      }
      if (holdingMomentum) {
        if (!fresh) {
          event.preventDefault();
          return;
        }
        holdingMomentum = false;
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
      if (touchSnapped) {
        event.preventDefault();
        return;
      }
      if (gliding) {
        // A new touch late in the glide takes over; earlier, it waits.
        if (inHandback()) stopGlide();
        else event.preventDefault();
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
      if (inHandback()) stopGlide(); // the key scrolls as usual
      else event.preventDefault();
      return;
    }
    const to = snapFor(down);
    if (!to) return;
    event.preventDefault();
    glide(to);
  });
});
