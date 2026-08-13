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
  let pointerX = .5;
  let pointerY = .45;
  let pointerTargetX = .5;
  let pointerTargetY = .45;
  let pointerStrength = 0;
  let pointerStrengthTarget = 0;
  let backgroundNodes = [];

  const buildNodeClusters = () => {
    let seed = 24681357;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const clusters = waveWidth < 700
      ? [[.18, .2, .18, .15, 16], [.78, .42, .2, .2, 18], [.3, .78, .24, .17, 18]]
      : [[.13, .2, .16, .18, 22], [.57, .12, .2, .13, 18], [.86, .4, .14, .22, 22], [.32, .76, .22, .16, 24], [.72, .84, .18, .14, 20]];

    backgroundNodes = clusters.flatMap(([cx, cy, spreadX, spreadY, count], cluster) =>
      Array.from({ length: count }, () => {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random());
        return {
          cluster,
          x: cx + Math.cos(angle) * radius * spreadX,
          y: cy + Math.sin(angle) * radius * spreadY,
          phase: random() * Math.PI * 2,
          drift: .55 + random() * .8,
          radius: .75 + random() * 1.15,
          opacity: .25 + random() * .48
        };
      })
    );
  };

  const resizeWaveGrid = () => {
    waveRatio = Math.min(window.devicePixelRatio || 1, 2);
    waveWidth = window.innerWidth;
    waveHeight = window.innerHeight;
    waveCanvas.width = Math.round(waveWidth * waveRatio);
    waveCanvas.height = Math.round(waveHeight * waveRatio);
    waveContext.setTransform(waveRatio, 0, 0, waveRatio, 0, 0);
    buildNodeClusters();
  };

  const drawWaveGrid = (time = 0) => {
    waveScroll += (waveScrollTarget - waveScroll) * (reducedMotion ? 1 : .055);
    pointerX += (pointerTargetX - pointerX) * .11;
    pointerY += (pointerTargetY - pointerY) * .11;
    pointerStrength += (pointerStrengthTarget - pointerStrength) * .08;
    const scrollPhase = waveScroll * .00135;
    const driftTime = reducedMotion ? 0 : time * .00008;
    const points = backgroundNodes.map((node) => {
        const nx = node.x + Math.sin(node.phase + driftTime * node.drift * 9) * .009 + Math.sin(scrollPhase + node.cluster) * .025;
        const ny = node.y + Math.cos(node.phase * 1.3 + driftTime * node.drift * 7) * .012 + Math.cos(scrollPhase * .7 + node.cluster) * .035;
        const pointerDx = nx - pointerX;
        const pointerDy = ny - pointerY;
        const pointerDistance = Math.hypot(pointerDx, pointerDy);
        const repulseRadius = waveWidth < 700 ? .28 : .2;
        const repulseRatio = Math.max(0, 1 - pointerDistance / repulseRadius);
        const repulseForce = repulseRatio * repulseRatio * pointerStrength;
        const repulseX = pointerDistance ? (pointerDx / pointerDistance) * repulseForce * 72 : 0;
        const repulseY = pointerDistance ? (pointerDy / pointerDistance) * repulseForce * 72 : 0;
        return {
          ...node,
          x: nx * waveWidth + repulseX,
          y: ny * waveHeight + repulseY
        };
      });

    waveContext.clearRect(0, 0, waveWidth, waveHeight);
    waveContext.lineWidth = .65;
    points.forEach((point, index) => {
      points.slice(index + 1).forEach((neighbor) => {
        if (point.cluster !== neighbor.cluster) return;
        const distance = Math.hypot(point.x - neighbor.x, point.y - neighbor.y);
        if (distance > 86) return;
        waveContext.strokeStyle = `rgba(220, 231, 227, ${(1 - distance / 86) * .12})`;
        waveContext.beginPath();
        waveContext.moveTo(point.x, point.y);
        waveContext.lineTo(neighbor.x, neighbor.y);
        waveContext.stroke();
      });
    });

    points.forEach((point) => {
      waveContext.fillStyle = `rgba(241, 247, 243, ${point.opacity})`;
      waveContext.beginPath();
      waveContext.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
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
  window.addEventListener("pointermove", (event) => {
    pointerTargetX = event.clientX / Math.max(window.innerWidth, 1);
    pointerTargetY = event.clientY / Math.max(window.innerHeight, 1);
    pointerStrengthTarget = 1;
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { pointerStrengthTarget = 0; }, { passive: true });
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

  const fetchSource = (url) => fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Metrics unavailable: ${url}`);
    return response.text();
  });

  const liveMetrics = fetchSource(metricsConsole.dataset.metricsSource).then((metrics) => {
      updateMetric("#metric-repositories", /Contributed to ([\d,]+) repositories/, metrics);
      updateMetric("#metric-highest", /Highest in a day at ([\d,]+)/, metrics);
      updateMetric("#metric-average", /Average per day at ~([\d.]+)/, metrics);
      updateMetric("#metric-languages", /(\d+) Languages/, metrics);
    });

  // The dedicated streak provider traverses the complete contribution history;
  // the isocalendar feed above is deliberately excluded because it is half-year bounded.
  const streakMetrics = fetchSource(metricsConsole.dataset.streakSource).then((svg) => {
    const text = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement.textContent.replace(/\s+/g, " ");
    updateMetric("#metric-total-contributions", /([\d,]+) Total Contributions/, text);
    updateMetric("#metric-streak", /([\d,]+) Current Streak/, text);
    updateMetric("#metric-longest-streak", /([\d,]+) Longest Streak/, text);
  });

  Promise.allSettled([liveMetrics, streakMetrics]).then((results) => {
    if (!status) return;
    status.textContent = results.every(({ status: sourceStatus }) => sourceStatus === "fulfilled")
      ? "Synced sources"
      : "Latest snapshot";
  });
}
