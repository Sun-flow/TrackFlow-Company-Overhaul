// Mobile menu: the toggle button shows and hides #mobile-menu below the md breakpoint.
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector("[data-nav-toggle]");
  if (!toggle) return;
  const menu = document.getElementById(toggle.getAttribute("aria-controls"));
  const label = toggle.querySelector("[data-nav-label]");
  const openIcon = toggle.querySelector('[data-nav-icon="open"]');
  const closeIcon = toggle.querySelector('[data-nav-icon="close"]');

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    label.textContent = open ? "Close main menu" : "Open main menu";
    openIcon.classList.toggle("hidden", open);
    closeIcon.classList.toggle("hidden", !open);
  };

  toggle.addEventListener("click", () => setOpen(!isOpen()));

  // Following a link (including same-page anchors) closes the menu.
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // If the window grows past the breakpoint with the menu open, reset it.
  window.matchMedia("(min-width: 48rem)").addEventListener("change", (event) => {
    if (event.matches && isOpen()) setOpen(false);
  });
});
