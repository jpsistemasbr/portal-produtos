(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("siteNav");
  const navActions = document.querySelector(".nav-actions");

  if (!header || !toggle) return;

  const setExpanded = (expanded) => {
    header.classList.toggle("is-open", expanded);
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  };

  const closeIfDesktop = () => {
    if (window.matchMedia("(min-width: 641px)").matches) {
      setExpanded(false);
    }
  };

  toggle.addEventListener("click", () => {
    setExpanded(!header.classList.contains("is-open"));
  });

  [nav, navActions].forEach((container) => {
    if (!container) return;
    container.addEventListener("click", (event) => {
      if (!event.target) return;
      const link = event.target.closest("a");
      const button = event.target.closest("button");

      if (link) {
        setExpanded(false);
        return;
      }

      if (button && button.classList.contains("nav-link")) {
        setExpanded(false);
      }
    });
  });

  window.addEventListener("resize", closeIfDesktop);
})();
