const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const waveCanvas = document.querySelector(".wave-grid");

if (waveCanvas) {
  const waveContext = waveCanvas.getContext("2d");
  let waveFrame;
  let waveWidth = 0;
  let waveHeight = 0;
  let waveRatio = 1;
  let waveScroll = window.scrollY;
  let waveScrollTarget = window.scrollY;

  const resizeWaveGrid = () => {
    waveRatio = Math.min(window.devicePixelRatio || 1, 2);
    waveWidth = window.innerWidth;
    waveHeight = window.innerHeight;
    waveCanvas.width = Math.round(waveWidth * waveRatio);
    waveCanvas.height = Math.round(waveHeight * waveRatio);
    waveContext.setTransform(waveRatio, 0, 0, waveRatio, 0, 0);
  };

  const drawWaveGrid = (time = 0) => {
    const spacing = waveWidth < 700 ? 48 : 58;
    const columns = Math.ceil(waveWidth / spacing) + 8;
    const rows = Math.ceil(waveHeight / spacing) + 10;
    const phase = reducedMotion ? 0 : time * .00016;
    waveScroll += (waveScrollTarget - waveScroll) * (reducedMotion ? 1 : .055);
    const scrollPhase = waveScroll * .00135;
    const centreX = waveWidth * .5;
    const centreY = waveHeight * .42;
    const points = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, column) => {
        const baseX = (column - 4) * spacing;
        const baseY = (row - 4) * spacing;
        const nx = baseX / Math.max(waveWidth, 1);
        const ny = baseY / Math.max(waveHeight, 1);
        const ridgeOne = Math.exp(-(((nx - .24 - Math.sin(scrollPhase) * .12) ** 2) / .026 + ((ny - .27) ** 2) / .09));
        const ridgeTwo = Math.exp(-(((nx - .76) ** 2) / .055 + ((ny - .72 + Math.cos(scrollPhase * .8) * .16) ** 2) / .045));
        const valley = Math.exp(-(((nx - .53) ** 2) / .035 + ((ny - .48) ** 2) / .06));
        const rolling = Math.sin(nx * 8.4 + ny * 3.2 + phase * 3.1 + scrollPhase) * .36
          + Math.cos(ny * 9.2 - nx * 2.6 - phase * 2.2 - scrollPhase * .7) * .22;
        const depth = ridgeOne * 1.35 + ridgeTwo * .95 - valley * .78 + rolling;
        const perspective = 1 + depth * .17;
        const skew = depth * 28;
        return {
          x: centreX + (baseX - centreX) * perspective + skew,
          y: centreY + (baseY - centreY) * perspective - depth * 54,
          depth
        };
      })
    );

    waveContext.clearRect(0, 0, waveWidth, waveHeight);
    waveContext.lineWidth = .75;
    waveContext.strokeStyle = "rgba(220, 231, 227, .2)";

    const drawLine = (linePoints) => {
      waveContext.beginPath();
      linePoints.forEach((point, index) => index ? waveContext.lineTo(point.x, point.y) : waveContext.moveTo(point.x, point.y));
      waveContext.stroke();
    };

    points.forEach(drawLine);
    for (let column = 0; column < columns; column += 1) drawLine(points.map((row) => row[column]));

    points.flat().forEach((point) => {
      const prominence = Math.max(0, Math.min(1, (point.depth + .7) / 2));
      waveContext.fillStyle = `rgba(241, 247, 243, ${.3 + prominence * .42})`;
      waveContext.beginPath();
      waveContext.arc(point.x, point.y, .8 + prominence * 1.05, 0, Math.PI * 2);
      waveContext.fill();
    });

    if (!reducedMotion && !document.hidden) waveFrame = requestAnimationFrame(drawWaveGrid);
  };

  const restartWaveGrid = () => {
    cancelAnimationFrame(waveFrame);
    drawWaveGrid(performance.now());
  };

  resizeWaveGrid();
  drawWaveGrid();
  window.addEventListener("scroll", () => { waveScrollTarget = window.scrollY; }, { passive: true });
  window.addEventListener("resize", () => { resizeWaveGrid(); restartWaveGrid(); }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) restartWaveGrid(); });
}

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
