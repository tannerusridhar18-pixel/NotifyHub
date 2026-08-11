document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector(".site-nav");
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      const expanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!expanded));
      siteNav.classList.toggle("is-open", !expanded);
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const targetId = anchor.getAttribute("href");
      if (!targetId || targetId === "#") {
        return;
      }

      const target = document.querySelector(targetId);
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });

      if (siteNav?.classList.contains("is-open")) {
        siteNav.classList.remove("is-open");
        menuToggle?.setAttribute("aria-expanded", "false");
      }
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  }, { threshold: 0.18 });

  document.querySelectorAll(".section-animate").forEach((section) => {
    observer.observe(section);
  });

  const updateActiveNav = () => {
    const scrollY = window.scrollY + 120;

    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    }

    let activeId = "#top";
    sections.forEach((section) => {
      if (section.offsetTop <= scrollY) {
        activeId = `#${section.id}`;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === activeId);
    });
  };

  updateActiveNav();
  window.addEventListener("scroll", updateActiveNav, { passive: true });
});
