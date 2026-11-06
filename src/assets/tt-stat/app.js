/* ============ ДАННЫЕ — меняй только этот блок ============ */
const DATA = {
  video: {
    duration: "11.77 с.",
    cover: "https://i.ibb.co/1xyLSZ1/image.png",
    published: "Опубликовано 31 окт 2026, 04:10",
    stats: [57539, 547, 0, 39, 23],            
  },

  /* ---- Обзор ---- */
  metrics: {
    views: { label: "Просмотры видео",             value: 57539 }, 
    total: { label: "Общее время просмотра",       value: "38 ч.:21 мин.:30 с." }, 
    avg:   { label: "Среднее время просмотра",     value: "2.4 с." },             
    full:  { label: "Просмотрели видео полностью", value: "6%" },                 
    subs:  { label: "Новые подписчики",            value: "168" },                
  },
  
  // 44 значения (0h - 43h). Растянутая волна, долгий пик. Сумма 57539
  viewsByHour: [
    500, 1500, 4500, 8500, 12000, 15000, 17500, 18500, 18500, 18000, 
    17500, 16500, 15000, 13500, 12000, 10500, 9000, 7500, 6200, 5000, 
    4000, 3200, 2500, 1900, 1500, 1100, 850, 650, 500, 380, 
    480, 750, 1150, 1110, 80, 60, 45, 35, 25, 20, 
    15, 10, 8, 7, 2, 30, 120
  ],
  // Значения по оси Y (ровно 4 метки)
  viewsTicks: [5000, 10000, 15000, 20000], 
  
  // Данные удержания (12 секунд: от 0 до 11)
  retention: [100, 28, 16, 10, 7, 5, 4, 3, 2, 2, 1, 1, 1],
  avgWatchedPercent: 6,
  
  sources: [
    ["Для вас", 99.1],
    ["Другое", 0.7],
    ["Поиск", 0.1],
    ["Личный профиль", 0.1],
    ["Звук", 0],
    ["Подписки", 0],
    ["Личные сообщения", 0]
  ],

  /* ---- Зрители ---- */
  totalViewers: 48000, 
  viewerTypes: [
    { left: ["Новые зрители", 98],  right: ["Вернувшиеся зрители", 2] },
    { left: ["Не подписчики", 97],  right: ["Подписчики", 3] },
  ],
  gender: [["Мужской", 68], ["Женский", 29], ["Другое", 3, true]],
  ages: [["18 - 24", 53], ["25 - 34", 27], ["35 - 44", 18], ["45+", 8]],
  
  places: [
    ["Украина", 24.8], 
    ["Соединенные Штаты", 15.6, true], 
    ["Беларусь", 13.2], 
    ["Казахстан", 10.4], 
    ["Германия", 7.8], 
    ["Польша", 5.1], 
    ["Румыния", 4.2], 
    ["Нидерланды", 3.5], 
    ["Соединенное Королевство", 3.1], 
    ["Турция", 2.2], 
    ["Другое", 10.1, true]
  ],

  /* ---- Вовлеченность ---- */
  likes: {
    values: [40, 25, 15, 10, 6, 4, 8, 12, 15, 10, 5, 2, 1],
    ticks: [20, 40], 
    text: "Большинство зрителей поставили лайк этому видео на отметке 0:01. Узнайте, какой момент понравился зрителям.",
  },
};
/* ========================================================= */

const $ = id => document.getElementById(id);
const BLUE = "#0a74da";
const CHEV = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ---------- сводка по видео ---------- */
document.querySelectorAll("[data-vid]:not(.sm)").forEach(el => el.insertAdjacentHTML("afterbegin",
  `<svg class="vplay" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="#fff"/></svg>`));

$("summary").querySelector(".vid").insertAdjacentHTML("afterbegin", `<img src="${DATA.video.cover}" alt="">`);
$("dur").textContent = DATA.video.duration;
document.querySelector('[data-pane="overview"] .preview').innerHTML =
  `<img src="${DATA.video.cover}" alt="">
   <div class="play">
     <svg viewBox="0 0 24 24" width="38" height="34">
       <path d="M8 5.14v13.72a1.5 1.5 0 0 0 2.25 1.3l10.5-6.86a1.5 1.5 0 0 0 0-2.6l-10.5-6.86A1.5 1.5 0 0 0 8 5.14z" fill="#fff"/>
     </svg>
   </div>`;

document.querySelector('[data-pane="engagement"] .big-vid').innerHTML = 
  `<img src="${DATA.video.cover}" alt="" style="width:100%; height:100%; object-fit:cover; border-radius:6px; opacity:0.7;">
   <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
     <svg viewBox="0 0 24 24" width="38" height="34">
       <path d="M8 5.14v13.72a1.5 1.5 0 0 0 2.25 1.3l10.5-6.86a1.5 1.5 0 0 0 0-2.6l-10.5-6.86A1.5 1.5 0 0 0 8 5.14z" fill="#fff"/>
     </svg>
   </div>`;

$("pub").textContent = DATA.video.published;

const ICONS = [
  `<path d="M7 4.5L19 12 7 19.5z"/>`,
  `<path d="M12 20C6.8 16 3.8 13.2 3.8 9.5 3.8 6.9 5.7 5 8 5c1.7 0 3.1 1 4 2.600C12.9 6 14.3 5 16 5c2.3 0 4.2 1.9 4.2 4.500C20.2 13.2 17.2 16 12 20z"/>`,
  `<path d="M12 4C7.6 4 4 7 4 10.700c0 2.2 1.2 4.1 3.1 5.300l-.9 3.6 3.7-2c.7.1 1.4.2 2.1.2 4.4 0 8-3.3 8-7.100C20 7 16.4 4 12 4z"/><circle cx="8.5" cy="10.9" r="1.2"/><circle cx="12" cy="10.9" r="1.2"/><circle cx="15.5" cy="10.9" r="1.2"/>`,
  `<path d="M14 5.500l6.5 6-6.5 6v-3.300c-4 0-7 1.2-9.5 4.3.7-5.1 4-8.7 9.5-9.500z"/>`,
  `<path d="M7 4.500h10v15l-5-4-5 4z"/>`,
];

// Форматирование в K
const fmtKExact = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
const fmtKFloor = n => n >= 10000 ? Math.floor(n / 1000) + "K" : n.toLocaleString("en-US");

$("stats").innerHTML = DATA.video.stats.map((v, i) =>
  `<div><svg viewBox="0 0 24 24" width="22" height="22">${ICONS[i]}</svg>${i === 0 ? fmtKFloor(v) : v.toLocaleString("en-US")}</div>`).join("");

/* ---------- вкладки ---------- */
const tabBtns = [...document.querySelectorAll(".tabs button")];
const tabIndicator = document.getElementById("tab-indicator");

function moveIndicator(activeBtn) {
  if (!activeBtn) return;
  const extra = 6;
  tabIndicator.style.width = `${activeBtn.offsetWidth + extra * 2}px`;
  tabIndicator.style.transform = `translateX(${activeBtn.offsetLeft - extra}px)`;
}

function showTab(name, scroll) {
  if (!document.querySelector(`.pane[data-pane="${name}"]`)) name = "overview";
  let activeBtn = null;

  tabBtns.forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on);
    if (on) activeBtn = b;
  });

  if (activeBtn) moveIndicator(activeBtn);

  document.querySelectorAll(".pane").forEach(p => p.hidden = p.dataset.pane !== name);
  history.replaceState(null, "", "#" + name);
  
  if (name === "overview" && typeof fitValues === "function") requestAnimationFrame(fitValues);
  
  const lim = $("summary").offsetHeight;          
  if (scroll && window.scrollY > lim) window.scrollTo(0, lim);
}

tabBtns.forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab, true)));

window.addEventListener('resize', () => {
  const activeBtn = document.querySelector('.tabs button.on');
  if (activeBtn) moveIndicator(activeBtn);
});

(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  const activeBtn = document.querySelector('.tabs button.on');
  if (activeBtn) moveIndicator(activeBtn);
});

/* ---------- графики ---------- */
function areaPaths(pts, baseY) {
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return { line, area: `${line} L${pts[pts.length - 1][0]} ${baseY} L${pts[0][0]} ${baseY} Z` };
}

function areaChart(svgId, vals, o) {
  const svg = $(svgId), gid = "g-" + svgId;
  const x0 = o.x0 ?? 15, x1 = 346, top = 10;
  const base = o.H - (o.xLabels ? 30 : 10);
  const X = i => x0 + (i / (vals.length - 1)) * (x1 - x0);
  const Y = v => base - (v / o.max) * (base - top);
  const { line, area } = areaPaths(vals.map((v, i) => [X(i), Y(v)]), base);
  
  let gridHtml = o.ticks.map(t => `<line class="grid" x1="${x0}" x2="${x1 + 4}" y1="${Y(t)}" y2="${Y(t)}"/>
       <text x="394" y="${Y(t) + 4}" text-anchor="end">${t}${o.unit || ""}</text>`).join("");
       
  let xLabelsHtml = "";
  if (o.xLabels) {
    xLabelsHtml = 
      `<text x="${X(0)}" y="${o.H - 8}" text-anchor="start">${o.xLabels[0]}</text>
       <text x="${X(vals.length - 1)}" y="${o.H - 8}" text-anchor="end">${o.xLabels[o.xLabels.length - 1]}</text>`;
  }

  svg.setAttribute("viewBox", `0 0 400 ${o.H}`);
  svg.innerHTML =
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0" stop-color="${BLUE}" stop-opacity=".25"/><stop offset="1" stop-color="${BLUE}" stop-opacity=".02"/>
     </linearGradient></defs>` +
    gridHtml +
    `<line x1="${x0}" x2="${x1 + 4}" y1="${base}" y2="${base}" stroke="#c9cacd"/>` +
    `<path d="${area}" fill="url(#${gid})"/>` +
    `<path d="${line}" fill="none" stroke="${BLUE}" stroke-width="1.6" stroke-linejoin="round"/>` +
    (o.dot ? vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${o.dotRadius || 3.5}" fill="#fff" stroke="${BLUE}" stroke-width="${o.dotRadius ? 1.5 : 2}"/>`).join("") : "") +
    (o.slider ? `<line x1="${x0}" x2="${x0}" y1="${top}" y2="${base}" stroke="${BLUE}" stroke-width="1"/>
              <circle id="${svgId}-dot" r="4" fill="#fff" stroke="${BLUE}" stroke-width="2"/>` : "") +
    xLabelsHtml;
  return { X, Y };
}

function bindSlider(prefix, vals, X, Y) {
  const slider = $(prefix + "-slider"), dot = $(prefix + "-chart-dot"), secs = vals.length - 1;
  const fmt = s => "00:" + String(Math.round(s)).padStart(2, "0");
  slider.max = secs;
  $(prefix + "-end").textContent = fmt(secs);
  function update() {
    const s = +slider.value, i = Math.min(Math.floor(s), secs - 1), f = s - i;
    const p = vals[i] + (vals[i + 1] - vals[i]) * f;
    dot.setAttribute("cx", X(s)); dot.setAttribute("cy", Y(p));
    $(prefix + "-now").textContent = `${fmt(s)} (${Math.round(p)}%)`;
  }
  slider.addEventListener("input", update);
  update();
}

/* ---------- Обзор ---------- */
function fitValues() {
  const wrap = document.querySelector(".metrics"), total = $("v-total");
  if (!total.clientWidth) return;
  let s = 20; wrap.style.setProperty("--vs", s + "px");
  while (total.scrollWidth > total.clientWidth && s > 12) { s -= 0.5; wrap.style.setProperty("--vs", s + "px"); }
}

for (const k in DATA.metrics) {
  const v = DATA.metrics[k].value;
  $("l-" + k).textContent = DATA.metrics[k].label;
  $("v-" + k).textContent = typeof v === "number" ? fmtKExact(v) : v;
}

// График просмотров по часам
areaChart("views-chart", DATA.viewsByHour, { 
  H: 200, 
  max: 20000, // <--- Потолок 20 000 (под наши метки)
  ticks: DATA.viewsTicks, 
  xLabels: ["0h", "45h"], 
  x0: 15,  
  dot: false, // Без точек
  slider: false 
});

$("ret-lead").textContent = `В среднем, зрители смотрели ваше видео на ${DATA.avgWatchedPercent}%.`;
$("ret-sub").textContent = ""; 

{ 
  const c = areaChart("ret-chart", DATA.retention, { 
    H: 110, 
    max: 100, 
    ticks: [100, 50], 
    unit: "%", 
    dot: false, 
    slider: true 
  });
  bindSlider("ret", DATA.retention, c.X, c.Y); 
}

fitValues();
(document.fonts ? document.fonts.ready : Promise.resolve()).then(fitValues);
window.addEventListener("resize", fitValues);

document.querySelectorAll(".m").forEach(m => m.addEventListener("click", () => {
  document.querySelectorAll(".m").forEach(x => x.classList.toggle("sel", x === m));
}));

/* ---------- общий рендер полосок ---------- */
function bars(id, rows, dec) {
  $(id).innerHTML = rows.map(([name, v, chev]) => `
    <div class="src">
      <div class="src-h"><span>${name}</span><b>${v.toFixed(dec)}%${chev ? CHEV : ""}</b></div>
      <div class="bar ${v === 0 ? "zero" : ""}"><i style="width:${v}%"></i></div>
    </div>`).join("");
}
bars("sources", DATA.sources, 1);

/* ---------- Зрители ---------- */
$("v-total-viewers").textContent = fmtKExact(DATA.totalViewers);
$("types").innerHTML = DATA.viewerTypes.map(t => `
  <div class="split">
    <div class="nums"><span>${t.left[1]}%</span><span>${t.right[1]}%</span></div>
    <div class="sbar"><i style="flex:${t.left[1]}"></i><i style="flex:${t.right[1]}"></i></div>
    <div class="names"><span>${t.left[0]}</span><span>${t.right[0]}</span></div>
  </div>`).join("");

{ 
  const COLORS = ["#0a74da", "#7fb8ec", "#cce2f8"], cx = 80, cy = 80, R = 80, r = 52;
  const total = DATA.gender.reduce((s, g) => s + g[1], 0);
  const pt = (rad, t) => [cx + rad * Math.cos(Math.PI * (1 - t)), cy - rad * Math.sin(Math.PI * (1 - t))];
  let acc = 0, svg = "";
  DATA.gender.forEach((g, i) => {
    const t0 = acc / total, t1 = (acc += g[1]) / total;
    const [a, b, c, d] = [pt(R, t0), pt(R, t1), pt(r, t1), pt(r, t0)];
    svg += `<path d="M${a} A${R} ${R} 0 0 1 ${b} L${c} A${r} ${r} 0 0 0 ${d}Z" fill="${COLORS[i]}" stroke="#fff" stroke-width="1.5"/>`;
  });
  $("donut").innerHTML = svg;
  $("gender").innerHTML = DATA.gender.map(([n, v, chev], i) =>
    `<div class="leg"><i class="dot" style="background:${COLORS[i]}"></i><span>${n}</span><b>${v}%${chev ? CHEV : ""}</b></div>`).join("");
}
bars("ages", DATA.ages, 0);
bars("places", DATA.places, 1);

/* ---------- Вовлеченность ---------- */
$("likes-text").textContent = DATA.likes.text;
{ const L = DATA.likes, c = areaChart("likes-chart", L.values, { 
    H: 110, 
    max: 40, 
    ticks: L.ticks, 
    unit: "%", 
    dot: false, 
    slider: true,
    xLabels: false 
  });
  bindSlider("likes", L.values, c.X, c.Y); 
}

/* ---------- баннер: логотип 1:1 по высоте текстового блока ---------- */
function syncLogo() {
  const t = document.querySelector(".bn-text"), l = document.querySelector(".banner .logo");
  if (!t || !l) return;
  for (let k = 0; k < 2; k++) {
    const h = t.offsetHeight;
    if (h) { l.style.width = l.style.height = h + "px"; }
  }
}
syncLogo();
window.addEventListener("load", syncLogo);
window.addEventListener("resize", syncLogo);
(document.fonts ? document.fonts.ready : Promise.resolve()).then(syncLogo);

/* ---------- баннер ---------- */
$("banner-close").addEventListener("click", () => $("banner").remove());

showTab(location.hash.slice(1) || "overview", false);