(() => {
  "use strict";

  const SLOTS = 8;

  // ---------- generic utils ----------

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

  function polar(angleDeg, radiusPct) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: 50 + radiusPct * Math.sin(rad),
      y: 50 - radiusPct * Math.cos(rad),
    };
  }

  function shuffledIndexes(n) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const today = todayStr();

  // ---------- sound effects + vibration (shared) ----------

  let audioCtx = null;

  function getAudioCtx() {
    if (audioCtx) return audioCtx;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
    return audioCtx;
  }

  function playTone(freq, duration, delay, type, volume) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  function playCheckSound() {
    playTone(880, 0.1, 0, "sine", 0.18);
    playTone(1320, 0.09, 0.04, "sine", 0.1);
  }

  function playCompleteSound() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      playTone(freq, 0.24, i * 0.09, "triangle", 0.22);
    });
  }

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {
      /* not supported */
    }
  }

  // ---------- daily encouragement message ----------

  const ENCOURAGE_MESSAGES = [
    "오늘도 스스로와의 약속을 지켰어요. 정말 멋져요!",
    "작은 습관들이 모여 큰 변화를 만들어요. 오늘 하루도 수고했어요!",
    "포기하지 않고 끝까지 해낸 당신, 최고예요!",
    "오늘 하루, 어제보다 한 뼘 더 성장했어요.",
    "꾸준함이 가장 큰 재능이에요. 오늘도 증명했네요!",
    "당신의 노력은 반드시 쌓이고 있어요. 수고했어요!",
    "오늘의 완주, 스스로를 꼭 안아주세요.",
    "이 정도면 오늘 하루도 참 잘 살았어요!",
    "작은 성취가 모여 자신감이 돼요. 오늘도 해냈어요!",
    "매일의 반복이 결국 실력이 돼요. 대단해요!",
    "오늘도 나 자신에게 좋은 선물을 줬어요.",
    "습관은 배신하지 않아요. 오늘도 잘 쌓았어요!",
    "힘든 날에도 해냈다면, 그게 진짜 성장이에요.",
    "오늘의 당신, 어제의 당신보다 훨씬 단단해졌어요.",
    "완벽하지 않아도 괜찮아요, 계속하는 게 중요해요. 잘했어요!",
    "이 페이스 그대로면 뭐든 해낼 수 있어요!",
    "오늘 하루도 스스로를 챙긴 당신, 참 잘했어요.",
    "습관이 쌓이는 소리가 들리는 것 같아요. 수고했어요!",
    "오늘의 노력이 내일의 나를 만들어요.",
    "포기하고 싶었던 순간에도 해냈어요. 진짜 멋져요!",
  ];

  function pickDailyMessage(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
    }
    return ENCOURAGE_MESSAGES[hash % ENCOURAGE_MESSAGES.length];
  }

  // ---------- pizza artwork (shared, generated once) ----------

  const PIZZA_CX = 130;
  const PIZZA_CY = 130;

  function px(angleDeg, radius) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: PIZZA_CX + radius * Math.sin(rad),
      y: PIZZA_CY - radius * Math.cos(rad),
    };
  }

  // flat clip-art palette: bold dark outlines, clean cel-shaded fills
  const OUTLINE = "#3d2415";

  function svgPepperoni(cx, cy, r) {
    const dots = [
      [cx - r * 0.35, cy - r * 0.2, r * 0.15],
      [cx + r * 0.3, cy - r * 0.1, r * 0.13],
      [cx - r * 0.05, cy + r * 0.4, r * 0.14],
      [cx + r * 0.32, cy + r * 0.28, r * 0.11],
    ];
    const dotTags = dots
      .map(([dx, dy, dr]) => `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${dr.toFixed(1)}" fill="#e8a06e" opacity="0.9"/>`)
      .join("");
    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#c1432b" stroke="${OUTLINE}" stroke-width="2"/>
      ${dotTags}
      <ellipse cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.32).toFixed(1)}" rx="${(r * 0.26).toFixed(1)}" ry="${(r * 0.16).toFixed(1)}" fill="#fff" opacity="0.18"/>
    `;
  }

  function svgOlive(cx, cy, r) {
    return `
      <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.88}" fill="#2b2320" stroke="${OUTLINE}" stroke-width="1.6"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${(r * 0.42).toFixed(1)}" ry="${(r * 0.36).toFixed(1)}" fill="#f7c94c"/>
    `;
  }

  function svgBasil(cx, cy, rot) {
    return `
      <g transform="translate(${cx} ${cy}) rotate(${rot})">
        <path d="M -13 3 Q -6 -9 0 0 Q 6 -9 13 3 Q 5 8 0 5 Q -5 8 -13 3 Z" fill="#5fa84c" stroke="${OUTLINE}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M -9 3 Q 0 1 9 3" fill="none" stroke="${OUTLINE}" stroke-width="1" opacity="0.7"/>
      </g>
    `;
  }

  function svgMushroom(cx, cy, r, rot) {
    return `
      <g transform="translate(${cx} ${cy}) rotate(${rot})">
        <path d="M ${-r} 2 Q ${-r} ${-r * 0.95} 0 ${-r * 0.95} Q ${r} ${-r * 0.95} ${r} 2 Q 0 ${r * 0.5} ${-r} 2 Z" fill="#f3e6cc" stroke="${OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M ${-r * 0.62} 1.5 Q 0 ${-r * 0.35} ${r * 0.62} 1.5" fill="none" stroke="#c9a86a" stroke-width="1.4" opacity="0.8"/>
        <rect x="${(-r * 0.28).toFixed(1)}" y="1" width="${(r * 0.56).toFixed(1)}" height="${(r * 0.55).toFixed(1)}" rx="2" fill="#f3e6cc" stroke="${OUTLINE}" stroke-width="1.6"/>
      </g>
    `;
  }

  function svgFleck(cx, cy, rot) {
    return `<rect x="${(cx - 3).toFixed(1)}" y="${(cy - 3).toFixed(1)}" width="6" height="6" rx="1.4" fill="#c1432b" stroke="${OUTLINE}" stroke-width="0.8" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
  }

  const TOPPING_PATTERNS = [
    [ // pattern A - mixed (mushroom, olive, basil, pepperoni)
      { kind: "pepperoni", off: -14, radius: 44, r: 13 },
      { kind: "mushroom", off: 12, radius: 68, r: 11, rot: 8 },
      { kind: "olive", off: 0, radius: 88, r: 7.5 },
      { kind: "basil", off: -8, radius: 30, rot: -15 },
      { kind: "fleck", off: 15, radius: 30, rot: 20 },
      { kind: "fleck", off: -16, radius: 62, rot: -30 },
    ],
    [ // pattern B - pepperoni-forward
      { kind: "pepperoni", off: 0, radius: 46, r: 13 },
      { kind: "pepperoni", off: -15, radius: 80, r: 11 },
      { kind: "pepperoni", off: 14, radius: 76, r: 10 },
      { kind: "olive", off: 13, radius: 34, r: 7 },
      { kind: "fleck", off: -4, radius: 62, rot: 10 },
    ],
  ];

  function buildPizzaArtwork(withToppings) {
    const crustR = 124;
    const sauceR = 108;
    const cheeseR = 100;

    const shading = `
      <ellipse cx="96" cy="82" rx="72" ry="50" fill="#fff" opacity="0.16"/>
      <ellipse cx="168" cy="178" rx="70" ry="46" fill="#c1432b" opacity="0.08"/>
    `;

    let blotches = "";
    for (let k = 0; k < 9; k++) {
      const a = k * 40 + (k % 2) * 12;
      const radius = 26 + (k % 3) * 20;
      const p = px(a, radius);
      blotches += `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="11" ry="7" fill="#f9d76b" opacity="0.7" transform="rotate(${a} ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`;
    }

    let toppings = "";
    if (withToppings) {
      for (let i = 0; i < SLOTS; i++) {
        const ca = (i + 0.5) * 45 - 90;
        const pattern = TOPPING_PATTERNS[i % 2];
        pattern.forEach((t) => {
          const p = px(ca + t.off, t.radius);
          if (t.kind === "pepperoni") toppings += svgPepperoni(p.x, p.y, t.r);
          else if (t.kind === "olive") toppings += svgOlive(p.x, p.y, t.r);
          else if (t.kind === "basil") toppings += svgBasil(p.x, p.y, t.rot);
          else if (t.kind === "mushroom") toppings += svgMushroom(p.x, p.y, t.r, t.rot);
          else if (t.kind === "fleck") toppings += svgFleck(p.x, p.y, t.rot);
        });
      }
    }

    let cuts = "";
    for (let i = 0; i < SLOTS; i++) {
      const a = i * 45 - 90;
      const p = px(a, crustR - 3);
      cuts += `<line x1="${PIZZA_CX}" y1="${PIZZA_CY}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${OUTLINE}" stroke-width="2.2" opacity="0.55"/>`;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260">
        <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${crustR}" fill="#eda746" stroke="${OUTLINE}" stroke-width="5"/>
        <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${sauceR}" fill="#d1652f" stroke="${OUTLINE}" stroke-width="2"/>
        <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${cheeseR}" fill="#f7c94c" stroke="${OUTLINE}" stroke-width="2"/>
        ${blotches}
        ${toppings}
        ${cuts}
        ${shading}
      </svg>
    `.trim();

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  const TOPPED_PIZZA_URL = buildPizzaArtwork(true);
  const BLANK_PIZZA_URL = buildPizzaArtwork(false);

  // ---------- celebration sparkles (shared shapes/layout, one instance per tracker) ----------

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

  function buildSparkleLayer(el) {
    el.innerHTML = "";
    SPARKLE_LAYOUT.forEach((item, i) => {
      const p = polar(item.angle, item.radius);
      const color = SPARKLE_PALETTE[item.color % SPARKLE_PALETTE.length];
      const sp = document.createElement("div");
      sp.className = "sparkle";
      sp.style.left = `${p.x}%`;
      sp.style.top = `${p.y}%`;
      sp.style.width = `${item.size}px`;
      sp.style.height = `${item.size}px`;
      sp.style.animationDelay = `${item.delay}s`;
      sp.style.animationDuration = `${2.4 + (i % 5) * 0.35}s`;
      sp.innerHTML = `<svg viewBox="0 0 24 24">${sparkleShapeSVG(item, color)}</svg>`;
      el.appendChild(sp);
    });
  }

  // ---------- topping scatter (custom tracker only) ----------

  // 7 concentric rings x N habits, each ring a shuffled full pass over every
  // habit, so every topping appears exactly 7x and stays evenly spread out
  // (even radially and angularly) while which habit lands where, and how big
  // each instance is, is randomized.
  const TOPPING_RINGS = [6, 11, 16, 21, 26, 31, 36];

  function buildToppingLayout(habits) {
    const n = habits.length;
    if (n === 0) return [];
    const layout = [];
    const slotWidth = 360 / n;
    TOPPING_RINGS.forEach((ringRadius, ringIdx) => {
      const order = shuffledIndexes(n);
      const ringOffset = (ringIdx / TOPPING_RINGS.length) * slotWidth;
      order.forEach((habitIdx, slot) => {
        const habit = habits[habitIdx];
        const angle = (slot + 0.5) * slotWidth - 90 + ringOffset + (Math.random() * slotWidth * 0.5 - slotWidth * 0.25);
        const radius = ringRadius + (Math.random() * 6 - 3);
        const p = polar(angle, radius);
        layout.push({
          id: habit.id,
          emoji: habit.topping || "🍕",
          x: Math.round(p.x * 10) / 10,
          y: Math.round(p.y * 10) / 10,
          rot: Math.round(Math.random() * 36 - 18),
          size: 9 + Math.round(Math.random() * 17),
          delay: Math.round(Math.random() * 700) / 1000,
        });
      });
    });
    return layout;
  }

  // ---------- tracker factory (shared by default + custom trackers) ----------

  function createTracker(cfg) {
    const $ = (name) => cfg.root.querySelector(`[data-el="${name}"]`);

    const pizzaWrap = $("pizzaWrap");
    const sparkleLayer = $("sparkleLayer");
    const completeMsg = $("completeMsg");
    const encourageMsg = $("encourageMsg");
    const countDoneEl = $("countDone");
    const countTotalEl = $("countTotal");
    const habitListEl = $("habitList");
    const addForm = $("addForm");
    const addInput = $("addInput");
    const addEmojiInput = cfg.hasEmoji ? $("addEmoji") : null;
    const addBtn = $("addBtn");
    const fullHint = $("fullHint");
    const statStreak = $("statStreak");
    const statTotal = $("statTotal");
    const resetBtn = $("resetBtn");
    const finishBtn = $("finishBtn");
    const fullCompleteText = completeMsg.textContent;

    const pizzaEl = cfg.sliced ? $("pizza") : null;
    const pizzaBaseEl = cfg.sliced ? null : $("pizzaBase");
    const toppingLayer = cfg.sliced ? null : $("toppingLayer");

    let habits = loadJSON(cfg.keys.habits, []);
    let state = loadJSON(cfg.keys.state, null);
    let history = loadJSON(cfg.keys.history, []);

    function persistHabits() { saveJSON(cfg.keys.habits, habits); }
    function persistState() { saveJSON(cfg.keys.state, state); }
    function persistHistory() { saveJSON(cfg.keys.history, history); }

    // if the day changed while a previous day was left unfinished (checked
    // some habits but never hit 8/8 or "오늘은 여기까지"), auto-close it out
    // as a partial day instead of silently losing that progress
    if (state && state.date !== today && !state.boxed) {
      const leftoverHabits = habits.filter((h) => state.completed && state.completed[h.id]);
      const alreadyRecorded = history.some((h) => h.date === state.date);
      if (leftoverHabits.length > 0 && !alreadyRecorded) {
        const entry = { date: state.date, names: leftoverHabits.map((h) => h.name), full: false };
        if (!cfg.sliced) entry.layout = buildToppingLayout(leftoverHabits);
        history.push(entry);
        persistHistory();
      }
    }

    if (!state || state.date !== today) {
      state = { date: today, completed: {}, boxed: false };
      saveJSON(cfg.keys.state, state);
    }

    function buildSlices() {
      pizzaEl.innerHTML = "";
      for (let i = 0; i < SLOTS; i++) {
        const a0 = (i * 360) / SLOTS - 90;
        const a1 = ((i + 1) * 360) / SLOTS - 90;
        const r = 80;
        const p0 = polar(a0, r);
        const p1 = polar(a1, r);

        const slice = document.createElement("div");
        slice.className = "slice";
        slice.style.clipPath = `polygon(50% 50%, ${p0.x}% ${p0.y}%, ${p1.x}% ${p1.y}%)`;

        const empty = document.createElement("div");
        empty.className = "slice-empty";

        const img = document.createElement("div");
        img.className = "slice-img";
        img.style.backgroundImage = TOPPED_PIZZA_URL;

        slice.appendChild(empty);
        slice.appendChild(img);
        pizzaEl.appendChild(slice);
      }
    }

    if (cfg.sliced) {
      buildSlices();
    } else {
      pizzaBaseEl.style.backgroundImage = BLANK_PIZZA_URL;
    }

    buildSparkleLayer(sparkleLayer);

    function isCompletedToday(id) {
      return !!state.completed[id];
    }

    function completedCount() {
      return habits.filter((h) => isCompletedToday(h.id)).length;
    }

    function renderPizza() {
      if (cfg.sliced) {
        const sliceEls = pizzaEl.querySelectorAll(".slice");
        sliceEls.forEach((el, i) => {
          const habit = habits[i];
          el.classList.remove("filled", "placeholder");
          if (!habit) el.classList.add("placeholder");
          else if (isCompletedToday(habit.id)) el.classList.add("filled");
        });
      }
      countDoneEl.textContent = String(completedCount());
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

        const nodes = [check];

        if (cfg.hasEmoji) {
          const topping = document.createElement("span");
          topping.className = "habit-topping";
          topping.textContent = habit.topping || "🍕";
          nodes.push(topping);
        }

        const name = document.createElement("span");
        name.className = "habit-name";
        name.textContent = habit.name;
        name.addEventListener("click", () => { if (!locked) toggleHabit(habit.id); });
        nodes.push(name);

        const tag = document.createElement("span");
        tag.className = "habit-slice-tag";
        tag.textContent = `#${i + 1}`;
        nodes.push(tag);

        const del = document.createElement("button");
        del.type = "button";
        del.className = "habit-del";
        del.textContent = "✕";
        del.title = "습관 삭제";
        del.disabled = locked;
        del.addEventListener("click", () => removeHabit(habit.id));
        nodes.push(del);

        li.append(...nodes);
        habitListEl.appendChild(li);
      });

      const canAdd = habits.length < SLOTS && !locked;
      addInput.disabled = !canAdd;
      if (addEmojiInput) addEmojiInput.disabled = !canAdd;
      addBtn.disabled = !canAdd;
      fullHint.classList.toggle("show", habits.length >= SLOTS && !locked);
      finishBtn.disabled = locked || completedCount() === 0;
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

    function renderStats() {
      statTotal.textContent = String(history.length);
      statStreak.textContent = String(computeStreak());
    }

    function renderToppingReveal() {
      toppingLayer.innerHTML = "";
      (state.toppingLayout || []).forEach((t) => {
        const el = document.createElement("div");
        el.className = "topping-emoji";
        el.style.left = `${t.x}%`;
        el.style.top = `${t.y}%`;
        el.style.fontSize = `${t.size}px`;
        el.style.animationDelay = `${t.delay}s`;
        el.style.setProperty("--rot", `${t.rot}deg`);
        el.textContent = t.emoji;
        toppingLayer.appendChild(el);
      });
      toppingLayer.classList.add("show");
    }

    function renderAll() {
      renderPizza();
      renderHabitList();
      renderStats();
    }

    function toggleHabit(id) {
      if (state.boxed) return;
      if (state.completed[id]) {
        delete state.completed[id];
      } else {
        state.completed[id] = true;
        playCheckSound();
        vibrate(15);
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
      const habit = { id: uid(), name };
      if (cfg.hasEmoji) habit.topping = addEmojiInput.value.trim() || "🍕";
      habits.push(habit);
      persistHabits();
      addInput.value = "";
      if (addEmojiInput) addEmojiInput.value = "";
      renderAll();
    });

    resetBtn.addEventListener("click", () => {
      if (!confirm("오늘의 습관 체크 기록을 초기화할까요?")) return;
      state = { date: today, completed: {}, boxed: false };
      persistState();

      const hadTodayEntry = history.some((h) => h.date === today);
      if (hadTodayEntry) {
        history = history.filter((h) => h.date !== today);
        persistHistory();
      }

      pizzaWrap.classList.remove("pulsing");
      sparkleLayer.classList.remove("show");
      completeMsg.classList.remove("show");
      if (encourageMsg) {
        encourageMsg.classList.remove("show");
        encourageMsg.textContent = "";
      }
      if (!cfg.sliced) {
        toppingLayer.classList.remove("show");
        toppingLayer.innerHTML = "";
      }
      renderAll();
      if (hadTodayEntry && cfg.onHistoryChange) cfg.onHistoryChange();
    });

    let sequenceRunning = false;

    function runCompleteSequence(skipAnimation = false) {
      if (sequenceRunning) return;
      sequenceRunning = true;

      const reveal = () => {
        sparkleLayer.classList.add("show");
        completeMsg.textContent = fullCompleteText;
        completeMsg.classList.add("show");
        if (encourageMsg) {
          encourageMsg.textContent = pickDailyMessage(state.date);
          encourageMsg.classList.add("show");
        }
        if (!cfg.sliced) renderToppingReveal();
      };

      if (skipAnimation) {
        reveal();
        sequenceRunning = false;
        return;
      }

      pizzaWrap.classList.add("pulsing");
      setTimeout(() => {
        pizzaWrap.classList.remove("pulsing");
        finalizeCompletion();
        reveal();
        playCompleteSound();
        vibrate([40, 60, 40, 60, 140]);
        sequenceRunning = false;
      }, 1800);
    }

    function finalizeCompletion() {
      state.boxed = true;
      state.full = true;
      if (!cfg.sliced && !state.toppingLayout) {
        state.toppingLayout = buildToppingLayout(habits);
      }
      persistState();

      const already = history.some((h) => h.date === state.date);
      if (!already) {
        const entry = { date: state.date, names: habits.map((h) => h.name), full: true };
        if (!cfg.sliced) entry.layout = state.toppingLayout;
        history.push(entry);
        persistHistory();
      }
      renderHabitList();
      renderStats();
      if (cfg.onHistoryChange) cfg.onHistoryChange();
    }

    function revealPartial() {
      completeMsg.textContent = "오늘은 여기까지! 내일 또 채워봐요 🍕";
      completeMsg.classList.add("show");
      if (encourageMsg) {
        encourageMsg.textContent = pickDailyMessage(state.date);
        encourageMsg.classList.add("show");
      }
      if (!cfg.sliced) renderToppingReveal();
    }

    function finishEarly() {
      if (state.boxed || completedCount() === 0) return;
      if (!confirm("오늘은 여기까지 하고 마무리할까요? 완료하지 못한 습관은 내일 다시 도전해요.")) return;

      const doneHabits = habits.filter((h) => isCompletedToday(h.id));

      state.boxed = true;
      state.full = false;
      if (!cfg.sliced) {
        state.toppingLayout = buildToppingLayout(doneHabits);
      }
      persistState();

      const already = history.some((h) => h.date === state.date);
      if (!already) {
        const entry = { date: state.date, names: doneHabits.map((h) => h.name), full: false };
        if (!cfg.sliced) entry.layout = state.toppingLayout;
        history.push(entry);
        persistHistory();
      }

      renderHabitList();
      renderStats();
      if (cfg.onHistoryChange) cfg.onHistoryChange();

      revealPartial();
      playCheckSound();
      vibrate(25);
    }

    finishBtn.addEventListener("click", finishEarly);

    renderAll();
    if (state.boxed) {
      if (state.full === false) revealPartial();
      else runCompleteSequence(true);
    }

    return { getHistory: () => history, getHabits: () => habits };
  }

  const defaultTracker = createTracker({
    root: document.querySelector('[data-panel="default"]'),
    keys: {
      habits: "pizza-habit-habits-v1",
      state: "pizza-habit-state-v1",
      history: "pizza-habit-history-v1",
    },
    hasEmoji: false,
    sliced: true,
    onHistoryChange: () => renderMonth(),
  });

  const customTracker = createTracker({
    root: document.querySelector('[data-panel="custom"]'),
    keys: {
      habits: "pizza-habit-habits-custom-v1",
      state: "pizza-habit-state-custom-v1",
      history: "pizza-habit-history-custom-v1",
    },
    hasEmoji: true,
    sliced: false,
    onHistoryChange: () => renderMonth(),
  });

  // ---------- mode tabs ----------

  const tabButtons = document.querySelectorAll(".mode-tab");
  const panels = document.querySelectorAll(".mode-panel");

  function setActiveMode(mode) {
    tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    panels.forEach((p) => { p.hidden = p.dataset.panel !== mode; });
    try { localStorage.setItem("pizza-tracker-active-mode", mode); } catch { /* ignore */ }
  }

  tabButtons.forEach((b) => b.addEventListener("click", () => setActiveMode(b.dataset.mode)));

  let savedMode = "default";
  try {
    savedMode = localStorage.getItem("pizza-tracker-active-mode") || "default";
  } catch { /* ignore */ }
  setActiveMode(savedMode === "custom" ? "custom" : "default");

  // ---------- calendar: "이달의 피자" (from the custom tracker's history) ----------

  const calTitle = document.getElementById("cal-title");
  const calGrid = document.getElementById("calendar-grid");
  const calPrevBtn = document.getElementById("cal-prev");
  const calNextBtn = document.getElementById("cal-next");

  const now = new Date();
  let calYear = now.getFullYear();
  let calMonth = now.getMonth(); // 0-indexed

  const MINI_SCALE = 0.22; // mini pizza is much smaller than the live 220px plate

  function renderCalendar() {
    calTitle.innerHTML = `이달의 피자 <span class="cal-sub">· ${calYear}년 ${calMonth + 1}월</span>`;
    calGrid.innerHTML = "";

    const defaultByDate = new Map(defaultTracker.getHistory().map((h) => [h.date, h]));
    const customByDate = new Map(customTracker.getHistory().map((h) => [h.date, h]));
    const firstWeekday = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    for (let i = 0; i < firstWeekday; i++) {
      const pad = document.createElement("div");
      pad.className = "cal-day empty";
      calGrid.appendChild(pad);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cell = document.createElement("div");
      cell.className = "cal-day";
      if (dateStr === today) cell.classList.add("today");

      const num = document.createElement("div");
      num.className = "day-num";
      num.textContent = String(d);
      cell.appendChild(num);

      const defaultEntry = defaultByDate.get(dateStr);
      const customEntry = customByDate.get(dateStr);

      if (defaultEntry || customEntry) {
        cell.classList.add("has-pizza");
        const primaryEntry = customEntry || defaultEntry;
        if (primaryEntry.full === false) cell.classList.add("partial");

        const titleParts = [];
        if (defaultEntry) {
          const label = defaultEntry.full === false ? "기본(일부)" : "기본";
          titleParts.push(label + ": " + (defaultEntry.names ? defaultEntry.names.join(", ") : ""));
        }
        if (customEntry) {
          const label = customEntry.full === false ? "커스텀(일부)" : "커스텀";
          titleParts.push(label + ": " + (customEntry.names ? customEntry.names.join(", ") : ""));
        }
        cell.title = titleParts.join(" / ");

        const mini = document.createElement("div");
        mini.className = "mini-pizza";
        mini.style.backgroundImage = customEntry ? BLANK_PIZZA_URL : TOPPED_PIZZA_URL;

        if (customEntry) {
          (customEntry.layout || []).forEach((t) => {
            const span = document.createElement("span");
            span.className = "mini-top";
            span.style.left = `${t.x}%`;
            span.style.top = `${t.y}%`;
            span.style.fontSize = `${Math.max(3, t.size * MINI_SCALE)}px`;
            span.textContent = t.emoji;
            mini.appendChild(span);
          });
        }

        cell.appendChild(mini);

        if (defaultEntry && customEntry) {
          const badge = document.createElement("span");
          badge.className = "mini-badge";
          badge.textContent = "🍕";
          badge.title = "기본 트래커도 완료";
          cell.appendChild(badge);
        }
      }

      calGrid.appendChild(cell);
    }
  }

  // ---------- monthly per-habit completion counts ----------

  const statsSub = document.getElementById("stats-sub");
  const statsDefaultBody = document.querySelector("#habit-stats-default tbody");
  const statsCustomBody = document.querySelector("#habit-stats-custom tbody");

  function renderHabitStatsTable(tbody, tracker, hasEmoji) {
    tbody.innerHTML = "";
    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-`;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthEntries = tracker.getHistory().filter((h) => h.date.startsWith(monthPrefix));
    const habits = tracker.getHabits();

    if (habits.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 2;
      td.className = "habit-stats-empty";
      td.textContent = "아직 등록된 습관이 없어요.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    habits.forEach((habit) => {
      const count = monthEntries.filter((e) => e.names && e.names.includes(habit.name)).length;
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.className = "habit-stats-name";
      nameTd.textContent = hasEmoji ? `${habit.topping || "🍕"} ${habit.name}` : habit.name;

      const countTd = document.createElement("td");
      countTd.className = "habit-stats-count";
      countTd.innerHTML = `${count}<span class="habit-stats-slash">/</span>${daysInMonth}`;

      tr.append(nameTd, countTd);
      tbody.appendChild(tr);
    });
  }

  function renderHabitStats() {
    statsSub.textContent = `· ${calYear}년 ${calMonth + 1}월`;
    renderHabitStatsTable(statsDefaultBody, defaultTracker, false);
    renderHabitStatsTable(statsCustomBody, customTracker, true);
  }

  function renderMonth() {
    renderCalendar();
    renderHabitStats();
  }

  calPrevBtn.addEventListener("click", () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderMonth();
  });

  calNextBtn.addEventListener("click", () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderMonth();
  });

  renderMonth();
})();
