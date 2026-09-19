(() => {
  "use strict";

  const SLOTS = 8;
  const STORAGE_HABITS = "pizza-habit-habits-v1";
  const STORAGE_STATE = "pizza-habit-state-v1";
  const STORAGE_HISTORY = "pizza-habit-history-v1";

  const $ = (sel) => document.querySelector(sel);

  const pizzaEl = $("#pizza");
  const pizzaWrap = $("#pizza-wrap");
  const sparkleLayer = $("#sparkle-layer");
  const completeMsg = $("#complete-msg");
  const countDoneEl = $("#count-done");
  const countTotalEl = $("#count-total");
  const habitListEl = $("#habit-list");
  const addForm = $("#add-form");
  const addInput = $("#add-input");
  const addBtn = $("#add-btn");
  const fullHint = $("#full-hint");
  const statStreak = $("#stat-streak");
  const statTotal = $("#stat-total");
  const resetBtn = $("#reset-btn");
  const historyRow = $("#history-row");
  const historyEmpty = $("#history-empty");

  // ---------- utils ----------

  function todayStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function prevDateStr(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return todayStr(d);
  }

  function formatShortDate(dateStr) {
    const [, m, d] = dateStr.split("-");
    return `${m}.${d}`;
  }

  function uid() {
    return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }

  // ---------- state ----------

  let habits = loadJSON(STORAGE_HABITS, []); // [{id, name}]
  let state = loadJSON(STORAGE_STATE, null); // {date, completed: {id:true}, boxed: bool}
  let history = loadJSON(STORAGE_HISTORY, []); // [{date, names}]

  const today = todayStr();

  if (!state || state.date !== today) {
    state = { date: today, completed: {}, boxed: false };
    saveJSON(STORAGE_STATE, state);
  }

  function persistHabits() { saveJSON(STORAGE_HABITS, habits); }
  function persistState() { saveJSON(STORAGE_STATE, state); }
  function persistHistory() { saveJSON(STORAGE_HISTORY, history); }

  // ---------- pizza slice geometry ----------

  function buildSlices() {
    pizzaEl.innerHTML = "";
    for (let i = 0; i < SLOTS; i++) {
      const a0 = (i * 360) / SLOTS - 90;
      const a1 = ((i + 1) * 360) / SLOTS - 90;
      const r = 80; // beyond circle radius so the parent's circular clip forms the arc
      const p0 = polar(a0, r);
      const p1 = polar(a1, r);

      const slice = document.createElement("div");
      slice.className = "slice";
      slice.dataset.index = String(i);
      slice.style.clipPath = `polygon(50% 50%, ${p0.x}% ${p0.y}%, ${p1.x}% ${p1.y}%)`;

      const empty = document.createElement("div");
      empty.className = "slice-empty";

      const img = document.createElement("div");
      img.className = "slice-img";
      img.style.backgroundImage = PIZZA_ART_URL;

      slice.appendChild(empty);
      slice.appendChild(img);
      pizzaEl.appendChild(slice);
    }
  }

  function polar(angleDeg, radiusPct) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: 50 + radiusPct * Math.sin(rad),
      y: 50 - radiusPct * Math.cos(rad),
    };
  }

  // ---------- hand-drawn cartoon pizza artwork (SVG, generated once) ----------

  const PIZZA_CX = 130;
  const PIZZA_CY = 130;

  function px(angleDeg, radius) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: PIZZA_CX + radius * Math.sin(rad),
      y: PIZZA_CY - radius * Math.cos(rad),
    };
  }

  // crayon/colored-pencil palette: warm crust + soft lavender outlines
  const OUTLINE = "#8a6bb5";
  const OUTLINE_DARK = "#6b4f96";

  function svgPepperoni(cx, cy, r) {
    const dots = [
      [cx - r * 0.35, cy - r * 0.2, r * 0.16],
      [cx + r * 0.3, cy - r * 0.1, r * 0.14],
      [cx - r * 0.05, cy + r * 0.4, r * 0.15],
      [cx + r * 0.35, cy + r * 0.25, r * 0.12],
    ];
    const dotTags = dots
      .map(([dx, dy, dr]) => `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${dr.toFixed(1)}" fill="#fff" opacity="0.8"/>`)
      .join("");
    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#eb9a95" stroke="${OUTLINE}" stroke-width="1.8"/>
      ${dotTags}
      <ellipse cx="${(cx - r * 0.32).toFixed(1)}" cy="${(cy - r * 0.35).toFixed(1)}" rx="${(r * 0.28).toFixed(1)}" ry="${(r * 0.18).toFixed(1)}" fill="#fff" opacity="0.3"/>
    `;
  }

  function svgOlive(cx, cy, r) {
    return `
      <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.9}" fill="#4b3a63" stroke="${OUTLINE_DARK}" stroke-width="1.4"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${(r * 0.4).toFixed(1)}" ry="${(r * 0.34).toFixed(1)}" fill="#fce9ae"/>
      <ellipse cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.3).toFixed(1)}" rx="${(r * 0.22).toFixed(1)}" ry="${(r * 0.14).toFixed(1)}" fill="#fff" opacity="0.3"/>
    `;
  }

  function svgBasil(cx, cy, rot) {
    return `
      <g transform="translate(${cx} ${cy}) rotate(${rot})">
        <ellipse cx="0" cy="0" rx="13" ry="7.5" fill="#7ec46e" stroke="${OUTLINE}" stroke-width="1.6"/>
        <path d="M -11 0 Q 0 -2.5 11 0" fill="none" stroke="${OUTLINE_DARK}" stroke-width="1" opacity="0.8"/>
        <ellipse cx="-3" cy="-2.5" rx="4" ry="2" fill="#fff" opacity="0.3"/>
      </g>
    `;
  }

  function svgTomato(cx, cy, r) {
    const seeds = [0, 1, 2, 3].map((k) => {
      const a = k * 90 + 20;
      const rad = (a * Math.PI) / 180;
      const sx = cx + Math.cos(rad) * r * 0.42;
      const sy = cy + Math.sin(rad) * r * 0.42;
      return `<ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="1.6" ry="1" fill="#ffe3b0" transform="rotate(${a} ${sx.toFixed(1)} ${sy.toFixed(1)})"/>`;
    }).join("");
    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ef5f65" stroke="${OUTLINE}" stroke-width="1.8"/>
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.72).toFixed(1)}" fill="#f58a82"/>
      ${seeds}
      <ellipse cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.35).toFixed(1)}" rx="${(r * 0.25).toFixed(1)}" ry="${(r * 0.16).toFixed(1)}" fill="#fff" opacity="0.3"/>
    `;
  }

  function svgOnion(cx, cy, r, rot) {
    return `
      <g transform="rotate(${rot} ${cx} ${cy})">
        <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${(r * 0.62).toFixed(1)}" fill="none" stroke="#fdf6ea" stroke-width="${(r * 0.34).toFixed(1)}"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${(r * 0.62).toFixed(1)}" fill="none" stroke="${OUTLINE}" stroke-width="1.4"/>
      </g>
    `;
  }

  const TOPPING_PATTERNS = [
    [ // pattern A
      { kind: "pepperoni", off: -13, radius: 46, r: 13 },
      { kind: "pepperoni", off: 11, radius: 70, r: 11 },
      { kind: "olive", off: 1, radius: 88, r: 7.5 },
      { kind: "basil", off: -9, radius: 28, rot: -20 },
      { kind: "onion", off: 12, radius: 55, r: 12, rot: 20 },
    ],
    [ // pattern B
      { kind: "tomato", off: 0, radius: 52, r: 13 },
      { kind: "pepperoni", off: -14, radius: 82, r: 10 },
      { kind: "olive", off: 13, radius: 36, r: 7 },
      { kind: "olive", off: 14, radius: 80, r: 6.5 },
      { kind: "basil", off: -3, radius: 66, rot: 24 },
    ],
  ];

  function buildPizzaArtwork() {
    const crustR = 124;
    const crustInnerR = 112;
    const cheeseR = 102;

    // dough-bump texture around the crust rim
    let bumps = "";
    for (let k = 0; k < 28; k++) {
      const a = k * (360 / 28);
      const p = px(a, 117);
      bumps += `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="6.5" ry="9" transform="rotate(${a} ${p.x.toFixed(1)} ${p.y.toFixed(1)})" fill="#e0983f" opacity="0.5"/>`;
    }

    // melty cheese speckles
    let speckles = "";
    for (let k = 0; k < 16; k++) {
      const a = k * 22.5 + (k % 3) * 6;
      const radius = 30 + (k % 4) * 15;
      const p = px(a, radius);
      speckles += `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="7" ry="5" fill="#f4dc8f" opacity="0.6" transform="rotate(${a} ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`;
    }

    // toppings, alternating pattern per slice so it reads as a varied hand-drawn pizza
    let toppings = "";
    for (let i = 0; i < SLOTS; i++) {
      const ca = (i + 0.5) * 45 - 90;
      const pattern = TOPPING_PATTERNS[i % 2];
      pattern.forEach((t) => {
        const p = px(ca + t.off, t.radius);
        if (t.kind === "pepperoni") toppings += svgPepperoni(p.x, p.y, t.r);
        else if (t.kind === "olive") toppings += svgOlive(p.x, p.y, t.r);
        else if (t.kind === "basil") toppings += svgBasil(p.x, p.y, t.rot);
        else if (t.kind === "tomato") toppings += svgTomato(p.x, p.y, t.r);
        else if (t.kind === "onion") toppings += svgOnion(p.x, p.y, t.r, t.rot);
      });
    }

    // slice cut-lines
    let cuts = "";
    for (let i = 0; i < SLOTS; i++) {
      const a = i * 45 - 90;
      const p = px(a, crustR - 4);
      cuts += `<line x1="${PIZZA_CX}" y1="${PIZZA_CY}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${OUTLINE}" stroke-width="2" opacity="0.8"/>`;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260">
        <defs>
          <filter id="crayon" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="6" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
        <g filter="url(#crayon)">
          <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${crustR}" fill="#f3bf62" stroke="${OUTLINE}" stroke-width="4"/>
          ${bumps}
          <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${crustInnerR}" fill="none" stroke="#e2953f" stroke-width="6" opacity="0.8"/>
          <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${cheeseR}" fill="#fce9ae" stroke="${OUTLINE}" stroke-width="2"/>
          ${speckles}
          ${toppings}
          ${cuts}
          <ellipse cx="92" cy="80" rx="70" ry="42" fill="#fff" opacity="0.16"/>
        </g>
      </svg>
    `.trim();

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  const PIZZA_ART_URL = buildPizzaArtwork();

  buildSlices();

  // ---------- celebration sparkles (placed around the pizza, twinkling) ----------

  function shapeStarBurst(color) {
    let lines = "";
    for (let k = 0; k < 8; k++) {
      const a = (k * 360) / 8;
      const rad = (a * Math.PI) / 180;
      const len = k % 2 === 0 ? 10.5 : 7;
      const x2 = 12 + Math.sin(rad) * len;
      const y2 = 12 - Math.cos(rad) * len;
      lines += `<line x1="12" y1="12" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    return lines;
  }

  function shapeSparkle4(color) {
    return `<path d="M12 1.5 Q13.6 9.5 22.5 12 Q13.6 14.5 12 22.5 Q10.4 14.5 1.5 12 Q10.4 9.5 12 1.5 Z" fill="${color}"/>`;
  }

  function shapeStar5(color, filled) {
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = (k * 36 - 90) * (Math.PI / 180);
      const r = k % 2 === 0 ? 10.5 : 4.5;
      pts.push(`${(12 + Math.cos(a) * r).toFixed(1)},${(12 + Math.sin(a) * r).toFixed(1)}`);
    }
    const attrs = filled ? `fill="${color}"` : `fill="none" stroke="${color}" stroke-width="2"`;
    return `<polygon points="${pts.join(" ")}" ${attrs} stroke-linejoin="round"/>`;
  }

  function shapeHeart(color) {
    return `<path d="M12 21 C4 15 1.5 10.5 3.6 7.2 C5.5 4.2 10 4.5 12 8.5 C14 4.5 18.5 4.2 20.4 7.2 C22.5 10.5 20 15 12 21 Z" fill="${color}"/>`;
  }

  function shapePlus(color) {
    return `<line x1="12" y1="5" x2="12" y2="19" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>`;
  }

  function shapeDot(color) {
    return `<circle cx="12" cy="12" r="4" fill="${color}"/>`;
  }

  function shapeRing(color) {
    return `<circle cx="12" cy="12" r="5.5" fill="none" stroke="${color}" stroke-width="2.4"/>`;
  }

  function shapeSwirl(color) {
    return `<path d="M4 16 Q4 8 12 8 Q19 8 19 13.5 Q19 18 13.5 18 Q10 18 10 14.5" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>`;
  }

  const SPARKLE_PALETTE = ["#ec5c8d", "#f0b429", "#4fa6e0", "#9b6fd1", "#35b7b0", "#6fbf5e", "#f2867a"];

  const SPARKLE_LAYOUT = [
    { shape: "burst", angle: -100, radius: 44, size: 40, color: 0, delay: 0.0 },
    { shape: "sparkle4", angle: -55, radius: 46, size: 24, color: 1, delay: 0.5 },
    { shape: "star5f", angle: -18, radius: 43, size: 26, color: 3, delay: 1.1 },
    { shape: "heart", angle: 18, radius: 45, size: 26, color: 0, delay: 0.3 },
    { shape: "sparkle4", angle: 55, radius: 43, size: 30, color: 1, delay: 1.6 },
    { shape: "burst", angle: 100, radius: 45, size: 34, color: 3, delay: 0.8 },
    { shape: "star5o", angle: 140, radius: 44, size: 26, color: 3, delay: 0.2 },
    { shape: "dot", angle: 165, radius: 40, size: 12, color: 4, delay: 1.4 },
    { shape: "plus", angle: -165, radius: 41, size: 16, color: 5, delay: 0.9 },
    { shape: "ring", angle: -135, radius: 42, size: 16, color: 2, delay: 1.8 },
    { shape: "swirl", angle: -145, radius: 47, size: 22, color: 3, delay: 0.6 },
    { shape: "sparkle4", angle: -80, radius: 40, size: 16, color: 6, delay: 2.1 },
    { shape: "star5f", angle: 78, radius: 40, size: 16, color: 5, delay: 1.3 },
    { shape: "dot", angle: 125, radius: 41, size: 10, color: 2, delay: 0.4 },
  ];

  function sparkleShapeSVG(item, color) {
    switch (item.shape) {
      case "burst": return shapeStarBurst(color);
      case "sparkle4": return shapeSparkle4(color);
      case "star5f": return shapeStar5(color, true);
      case "star5o": return shapeStar5(color, false);
      case "heart": return shapeHeart(color);
      case "plus": return shapePlus(color);
      case "dot": return shapeDot(color);
      case "ring": return shapeRing(color);
      case "swirl": return shapeSwirl(color);
      default: return "";
    }
  }

  function buildSparkleLayer() {
    sparkleLayer.innerHTML = "";
    SPARKLE_LAYOUT.forEach((item, i) => {
      const p = polar(item.angle, item.radius);
      const color = SPARKLE_PALETTE[item.color % SPARKLE_PALETTE.length];
      const el = document.createElement("div");
      el.className = "sparkle";
      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;
      el.style.width = `${item.size}px`;
      el.style.height = `${item.size}px`;
      el.style.animationDelay = `${item.delay}s`;
      el.style.animationDuration = `${2.4 + (i % 5) * 0.35}s`;
      el.innerHTML = `<svg viewBox="0 0 24 24">${sparkleShapeSVG(item, color)}</svg>`;
      sparkleLayer.appendChild(el);
    });
  }

  buildSparkleLayer();

  // ---------- rendering ----------

  function isCompletedToday(id) {
    return !!state.completed[id];
  }

  function completedCount() {
    return habits.filter((h) => isCompletedToday(h.id)).length;
  }

  function renderPizza() {
    const sliceEls = pizzaEl.querySelectorAll(".slice");
    sliceEls.forEach((el, i) => {
      const habit = habits[i];
      el.classList.remove("filled", "placeholder");
      if (!habit) {
        el.classList.add("placeholder");
      } else if (isCompletedToday(habit.id)) {
        el.classList.add("filled");
      }
    });
    const done = completedCount();
    countDoneEl.textContent = String(done);
    countTotalEl.textContent = String(SLOTS);
  }

  function renderHabitList() {
    habitListEl.innerHTML = "";
    const locked = state.boxed;

    habits.forEach((habit, i) => {
      const li = document.createElement("li");
      li.className = "habit-item" + (isCompletedToday(habit.id) ? " done" : "");

      const check = document.createElement("button");
      check.type = "button";
      check.className = "habit-check";
      check.textContent = "✓";
      check.disabled = locked;
      check.addEventListener("click", () => toggleHabit(habit.id));

      const name = document.createElement("span");
      name.className = "habit-name";
      name.textContent = habit.name;
      name.addEventListener("click", () => { if (!locked) toggleHabit(habit.id); });

      const tag = document.createElement("span");
      tag.className = "habit-slice-tag";
      tag.textContent = `#${i + 1}`;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "habit-del";
      del.textContent = "✕";
      del.title = "습관 삭제";
      del.disabled = locked;
      del.addEventListener("click", () => removeHabit(habit.id));

      li.append(check, name, tag, del);
      habitListEl.appendChild(li);
    });

    const canAdd = habits.length < SLOTS && !locked;
    addInput.disabled = !canAdd;
    addBtn.disabled = !canAdd;
    fullHint.classList.toggle("show", habits.length >= SLOTS && !locked);
  }

  function renderStats() {
    statTotal.textContent = String(history.length);
    statStreak.textContent = String(computeStreak());
  }

  function computeStreak() {
    const dates = new Set(history.map((h) => h.date));
    let cursor = today;
    let count = 0;
    if (dates.has(cursor)) {
      count = 1;
      cursor = prevDateStr(cursor);
    } else {
      cursor = prevDateStr(cursor);
    }
    while (dates.has(cursor)) {
      count++;
      cursor = prevDateStr(cursor);
    }
    return count;
  }

  const CHIP_COLORS = ["#fdece3", "#fdf3d6", "#e4f3fb", "#f1e9fb", "#e2f6ec"];

  function renderHistory() {
    const entries = history.slice(-14).reverse();
    historyEmpty.style.display = entries.length ? "none" : "block";
    historyRow.querySelectorAll(".history-chip").forEach((n) => n.remove());
    entries.forEach((entry, i) => {
      const chip = document.createElement("div");
      chip.className = "history-chip";
      chip.style.setProperty("--chip-bg", CHIP_COLORS[i % CHIP_COLORS.length]);
      chip.title = entry.names ? entry.names.join(", ") : entry.date;

      const icon = document.createElement("div");
      icon.className = "chip-icon";
      const color = SPARKLE_PALETTE[i % SPARKLE_PALETTE.length];
      icon.innerHTML = `<svg viewBox="0 0 24 24">${shapeStar5(color, true)}</svg>`;

      const dateEl = document.createElement("div");
      dateEl.className = "chip-date";
      dateEl.textContent = formatShortDate(entry.date);

      chip.append(icon, dateEl);
      historyRow.appendChild(chip);
    });
  }

  function renderAll() {
    renderPizza();
    renderHabitList();
    renderStats();
    renderHistory();
  }

  // ---------- interactions ----------

  function toggleHabit(id) {
    if (state.boxed) return;
    if (state.completed[id]) {
      delete state.completed[id];
    } else {
      state.completed[id] = true;
    }
    persistState();
    renderPizza();
    renderHabitList();

    if (habits.length === SLOTS && completedCount() === SLOTS) {
      runCompleteSequence();
    }
  }

  function removeHabit(id) {
    if (state.boxed) return;
    habits = habits.filter((h) => h.id !== id);
    delete state.completed[id];
    persistHabits();
    persistState();
    renderAll();
  }

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.boxed) return;
    const name = addInput.value.trim();
    if (!name || habits.length >= SLOTS) return;
    habits.push({ id: uid(), name });
    persistHabits();
    addInput.value = "";
    renderAll();
  });

  resetBtn.addEventListener("click", () => {
    if (!confirm("오늘의 습관 체크 기록을 초기화할까요?")) return;
    state = { date: today, completed: {}, boxed: false };
    persistState();
    pizzaWrap.classList.remove("pulsing");
    sparkleLayer.classList.remove("show");
    completeMsg.classList.remove("show");
    renderAll();
  });

  // ---------- completion sequence ----------

  let sequenceRunning = false;

  function runCompleteSequence(skipAnimation = false) {
    if (sequenceRunning) return;
    sequenceRunning = true;

    if (skipAnimation) {
      sparkleLayer.classList.add("show");
      completeMsg.classList.add("show");
      sequenceRunning = false;
      return;
    }

    pizzaWrap.classList.add("pulsing");

    setTimeout(() => {
      pizzaWrap.classList.remove("pulsing");
      sparkleLayer.classList.add("show");
      completeMsg.classList.add("show");
      finalizeCompletion();
      sequenceRunning = false;
    }, 1800);
  }

  function finalizeCompletion() {
    state.boxed = true;
    persistState();

    const already = history.some((h) => h.date === state.date);
    if (!already) {
      history.push({ date: state.date, names: habits.map((h) => h.name) });
      persistHistory();
    }
    renderHabitList();
    renderStats();
    renderHistory();
  }

  // ---------- init ----------

  renderAll();

  if (state.boxed) {
    runCompleteSequence(true);
  }
})();
