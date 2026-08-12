const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reducedMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible"));
}

document.querySelectorAll("[data-project-folder]").forEach((folder) => {
  const tabs = [...folder.querySelectorAll("[data-project-tab]")];
  const panels = [...folder.querySelectorAll("[data-project-panel]")];
  let activeIndex = 0;
  let rotationTimer;
  let isPaused = false;

  const scheduleRotation = () => {
    window.clearTimeout(rotationTimer);
    if (isPaused || reducedMotion || document.hidden) return;
    rotationTimer = window.setTimeout(() => {
      activateProject((activeIndex + 1) % tabs.length);
      scheduleRotation();
    }, 60000);
  };

  const activateProject = (index, moveFocus = false) => {
    activeIndex = index;
    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      if (isActive && moveFocus) tab.focus();
    });
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.toggle("is-active", panelIndex === index);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("pointerenter", () => activateProject(index));
    tab.addEventListener("focus", () => activateProject(index));
    tab.addEventListener("click", () => { activateProject(index); scheduleRotation(); });
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (activeIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      activateProject(nextIndex, true);
    });
  });

  folder.addEventListener("pointerenter", () => { isPaused = true; window.clearTimeout(rotationTimer); });
  folder.addEventListener("pointerleave", () => { isPaused = false; scheduleRotation(); });
  folder.addEventListener("focusin", () => { isPaused = true; window.clearTimeout(rotationTimer); });
  folder.addEventListener("focusout", (event) => {
    if (folder.contains(event.relatedTarget)) return;
    isPaused = false;
    scheduleRotation();
  });
  document.addEventListener("visibilitychange", scheduleRotation);

  activateProject(0);
  scheduleRotation();
});

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
  let frame;
  window.addEventListener("pointermove", (event) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
    });
  }, { passive: true });
}

const metricsConsole = document.querySelector("[data-metrics-source]");

if (metricsConsole) {
  const status = document.querySelector("#metrics-status");
  const updateMetric = (selector, pattern, source) => {
    const match = source.match(pattern);
    const element = document.querySelector(selector);
    if (match && element) element.textContent = match[1];
  };

  fetch(metricsConsole.dataset.metricsSource)
    .then((response) => {
      if (!response.ok) throw new Error("Metrics unavailable");
      return response.text();
    })
    .then((metrics) => {
      updateMetric("#metric-streak", /Current streak ([\d,]+) days/, metrics);
      updateMetric("#metric-repositories", /Contributed to ([\d,]+) repositories/, metrics);
      updateMetric("#metric-highest", /Highest in a day at ([\d,]+)/, metrics);
      updateMetric("#metric-average", /Average per day at ~([\d.]+)/, metrics);
      updateMetric("#metric-languages", /(\d+) Languages/, metrics);
      if (status) status.textContent = "Synced live";
    })
    .catch(() => {
      if (status) status.textContent = "Latest snapshot";
    });
}
