/* ==========================================================
   BIGX · KOC BOOKING HUB · app.js
   Toàn bộ logic: nạp dữ liệu, lọc, KPI, biểu đồ, bảng.
   Mục lục:
     1. Tiện ích ngày & số
     2. Nạp + chuẩn hoá dữ liệu
     3. Bộ lọc (thời gian, kênh, chiến dịch, phụ trách, lọc chéo)
     4. Biểu đồ (khởi tạo)
     5. Tab Tổng quan
     6. Tab CTV & Booking
     7. Tab Hiệu suất
     8. Tab Đối soát kế toán
     9. Tab Xuất file, điều hướng, khởi động
   ========================================================== */
(function () {
const CFG = window.KOC_CONFIG, KENH = CFG.kenh, KC = CFG.mauKenh, ST = CFG.trangThai;
const STC = ["t-mute", "t-info", "t-warn", "t-warn", "t-ok", "t-bad"], STCOL = ["#A3AED0", "#BF83FF", "#FFCF00", "#FF947A", "#3CD856", "#FA5A7D"];
const $ = id => document.getElementById(id);

/* ===== 1. Tiện ích ngày & số ===== */
// Ngày được lưu dạng số nguyên: số ngày tính từ 01/01/2020
const D0 = Date.UTC(2020, 0, 1), DAY = 864e5;
const fromIso = s => s ? Math.round((Date.parse(String(s).slice(0, 10) + "T00:00:00Z") - D0) / DAY) : null;
const dd = i => new Date(D0 + i * DAY), iso = i => dd(i).toISOString().slice(0, 10);
const fmt = i => { const d = dd(i); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0"); };
const fmtY = i => fmt(i) + "/" + dd(i).getUTCFullYear();
const now = new Date(), TODAY_ISO = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
const TODAY = fromIso(TODAY_ISO);
const vnd = n => Math.round(n || 0).toLocaleString("vi-VN"), m = n => ((n || 0) / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "tr";
const sum = (a, k) => a.reduce((x, b) => x + (b[k] || 0), 0), act = a => a.filter(b => b.st < 5);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toast = t => { const e = $("toast"); e.textContent = t; e.classList.add("on"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("on"), 2200); };

/* ===== 2. Nạp + chuẩn hoá dữ liệu ===== */
let ctv = [], bk = [], tt = [], PLAN = {}, CAMP = [], NS = [], START = TODAY - 365, DEMO = false;
function load(raw) {
  PLAN = raw.nganSachThang || CFG.nganSachThang || {};
  const byMa = new Map();
  ctv = (raw.ctv || []).map(x => {
    const c = { id: x.ma, ten: x.hoTen || "", sdt: String(x.sdt || "").replace(/\s/g, ""), kenh: x.kenh || "", fl: +x.follower || 0, nganh: x.nganh || "",
      rate: +x.rateCard || 0, stk: !!x.stk, cccd: !!x.cccd, tt: x.trangThai || "Active", ns: x.phuTrach || "", on: x.ngayOnboard || "" };
    byMa.set(c.id, c); return c;
  });
  const sdtCount = new Map(); ctv.forEach(c => c.sdt && sdtCount.set(c.sdt, (sdtCount.get(c.sdt) || 0) + 1));
  ctv.forEach(c => c.dup = c.sdt && sdtCount.get(c.sdt) > 1);
  bk = (raw.booking || []).map(x => {
    const c = byMa.get(x.maCTV) || { id: x.maCTV || "?", ten: "(Không có trong danh sách CTV)", kenh: "", ns: "", missing: true };
    const st = Math.max(0, ST.indexOf(x.trangThai)), dl = fromIso(x.deadline), dp = fromIso(x.ngayDang);
    const tre = dl != null && ((dp != null && dp > dl) || (dp == null && st < 2 && TODAY > dl));
    return { id: x.ma, c, camp: x.chienDich || "", day: fromIso(x.ngayBook) ?? TODAY, st, cost: +x.chiPhi || 0, view: +x.view || 0, eng: +x.tuongTac || 0, don: +x.don || 0, gmv: +x.gmv || 0, tre };
  }).sort((a, b) => b.day - a.day);
  tt = raw.thanhToan || [];
  CAMP = [...new Set(bk.map(b => b.camp).filter(Boolean))];
  NS = [...new Set(ctv.map(c => c.ns).filter(Boolean))];
  START = bk.length ? Math.min(...bk.map(b => b.day)) : TODAY - 365;
  $("fC").innerHTML = '<option value="">Tất cả chiến dịch</option>' + CAMP.map(x => `<option>${esc(x)}</option>`).join("");
  $("fN").innerHTML = '<option value="">Tất cả phụ trách</option>' + NS.map(x => `<option>${esc(x)}</option>`).join("");
  $("dF").min = $("dT").min = iso(START); $("dF").max = $("dT").max = iso(TODAY);
  rStatus();
}
function rStatus() {
  const e = $("status");
  if (DEMO) { e.className = "status demo"; e.innerHTML = `Đang xem DATA MẪU (giả) để thử giao diện. <button id="stB">Tắt data mẫu</button>`; }
  else if (!bk.length && !ctv.length) { e.className = "status"; e.innerHTML = `Chưa có dữ liệu. Web đang ở trạng thái trống. <button id="stB">Xem data mẫu</button>`; }
  else { e.className = "status"; e.innerHTML = `Dữ liệu: ${ctv.length} CTV · ${bk.length} booking`; return; }
  $("stB").onclick = () => { DEMO = !DEMO; load(DEMO ? window.makeDemoData(TODAY_ISO) : window.KOC_DATA); Object.assign(F, { k: "", c: "", n: "", st: null, ctv: null }); setPre(CFG.mocMacDinh); };
}

/* ===== 3. Bộ lọc ===== */
const F = { from: TODAY - 29, to: TODAY, pre: "30", k: "", c: "", n: "", st: null, ctv: null }, NUL = { st: null, ctv: null };
function flt(ex = [], o = {}) {
  const f = { ...F }; ex.forEach(k => f[k] = k in NUL ? null : ""); Object.assign(f, o);
  return bk.filter(b => b.day >= f.from && b.day <= f.to && (!f.k || b.c.kenh == f.k) && (!f.c || b.camp == f.c) && (!f.n || b.c.ns == f.n) && (f.st === null || b.st == f.st) && (!f.ctv || b.c === f.ctv));
}
const prevF = () => { const L = F.to - F.from + 1; return { from: F.from - L, to: F.from - 1 }; };
function tog(k, v) { F[k] = F[k] === v ? (k in NUL ? null : "") : v; renderAll(); }
function setPre(p) {
  F.pre = p;
  if (p == "all") { F.from = START; F.to = TODAY; }
  else if (p == "m") { const d = dd(TODAY); F.from = fromIso(d.toISOString().slice(0, 8) + "01"); F.to = TODAY; }
  else { F.from = TODAY - (+p) + 1; F.to = TODAY; }
  renderAll();
}
$("pre").querySelectorAll("span").forEach(e => e.onclick = () => setPre(e.dataset.p));
$("dF").onchange = e => { if (!e.target.value) return; F.from = fromIso(e.target.value); if (F.from > F.to) F.to = F.from; F.pre = ""; renderAll(); };
$("dT").onchange = e => { if (!e.target.value) return; F.to = Math.min(TODAY, fromIso(e.target.value)); if (F.to < F.from) F.from = F.to; F.pre = ""; renderAll(); };
KENH.forEach(x => $("fK").innerHTML += `<option>${esc(x)}</option>`);
[["fK", "k"], ["fC", "c"], ["fN", "n"]].forEach(([id, k]) => $(id).onchange = e => { F[k] = e.target.value; renderAll(); });
$("clr").onclick = () => { Object.assign(F, { k: "", c: "", n: "", st: null, ctv: null }); setPre(CFG.mocMacDinh); };
function rSlicer() {
  $("pre").querySelectorAll("span").forEach(e => e.classList.toggle("on", e.dataset.p == F.pre));
  $("dF").value = iso(F.from); $("dT").value = iso(F.to);
  const p = prevF(), L = F.to - F.from + 1;
  $("cmp").innerHTML = `<b>${L} ngày</b> · so với kỳ trước ${fmt(p.from)}–${fmt(p.to)}`;
  $("fK").value = F.k; $("fC").value = F.c; $("fN").value = F.n;
  const P = []; if (F.st !== null) P.push(["st", "Trạng thái: " + ST[F.st]]); if (F.ctv) P.push(["ctv", "CTV: " + F.ctv.ten]);
  $("pills").innerHTML = P.map(x => `<span class="pill" data-k="${x[0]}">${esc(x[1])} ✕</span>`).join("");
  $("pills").querySelectorAll(".pill").forEach(e => e.onclick = () => { F[e.dataset.k] = null; renderAll(); });
}
// Mốc trên trục thời gian: ≤31 ngày theo ngày, ≤120 ngày theo tuần, dài hơn theo tháng
function buckets() {
  const L = F.to - F.from + 1, B = [];
  if (L <= 31) { for (let d = F.from; d <= F.to; d++) B.push({ a: d, b: d, l: fmt(d) }); return { B, g: "theo ngày" }; }
  if (L <= 120) { for (let d = F.from; d <= F.to; d += 7) B.push({ a: d, b: Math.min(d + 6, F.to), l: fmt(d) }); return { B, g: "theo tuần" }; }
  let d = F.from;
  while (d <= F.to) { const x = dd(d), e = Math.min(F.to, Math.round((Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 1) - D0) / DAY) - 1); B.push({ a: d, b: e, l: "T" + (x.getUTCMonth() + 1) + "/" + String(x.getUTCFullYear()).slice(2) }); d = e + 1; }
  return { B, g: "theo tháng" };
}
const inB = (a, x) => a.filter(b => b.day >= x.a && b.day <= x.b);
const zoomTo = x => { F.from = x.a; F.to = x.b; F.pre = ""; renderAll(); };
// Ngân sách: lấy ngân sách tháng chia đều theo ngày
function planOf(a, b) {
  let t = 0;
  for (let d = a; d <= b; d++) {
    const x = dd(d), key = x.toISOString().slice(0, 7), mo = PLAN[key]; if (!mo) continue;
    const days = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
    KENH.forEach(k => { if (!F.k || F.k == k) t += (+mo[k] || 0) / days; });
  }
  return t;
}
function kpi(id, items) {
  $(id).innerHTML = items.map(([bg, fg, ic, l, v, cur, prev, inv, fp]) => {
    let d = "&nbsp;"; const P = x => fp ? fp(x) : x;
    if (prev != null && isFinite(prev) && prev !== 0 && cur != null && isFinite(cur)) {
      const x = (cur - prev) / Math.abs(prev) * 100, good = (x >= 0) !== !!inv;
      d = Math.abs(x) < .5 ? `<span>● 0%</span> · kỳ trước ${P(prev)}` : `<span class="${good ? "up" : "dn"}">${x >= 0 ? "▲" : "▼"} ${Math.abs(x).toFixed(0)}%</span> · kỳ trước ${P(prev)}`;
    } else if (prev === 0) d = "kỳ trước: 0";
    return `<div class="kpi"><i style="background:${bg};color:${fg}">${ic}</i><div style="min-width:0"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div></div>`;
  }).join("");
}
const emptyRow = (n, t) => `<tr><td colspan="${n}" class="empty">${t || "Chưa có dữ liệu trong bộ lọc này"}</td></tr>`;

/* ===== 4. Biểu đồ ===== */
Chart.defaults.font.family = "Poppins,system-ui,sans-serif"; Chart.defaults.font.size = 10.5; Chart.defaults.color = "#737791"; Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.legend.labels.usePointStyle = true; Chart.defaults.plugins.legend.labels.boxWidth = 7; Chart.defaults.plugins.legend.position = "bottom"; Chart.defaults.animation.duration = 400;
const dim = (c, on) => on ? c : c + "38", gX = { grid: { display: false }, border: { display: false } }, gY = { grid: { color: "#F1F3F9" }, border: { display: false }, beginAtZero: true }, tipM = c => c.dataset.label + ": " + m(c.raw);
const gM = { ...gY, suggestedMax: 5e6, ticks: { callback: m } };
const mk = (id, cfg) => { const ch = new Chart($(id), cfg); $(id).style.cursor = "pointer"; return ch; };
const tX = { ...gX, ticks: { maxRotation: 0, autoSkipPadding: 8 } };
let BK = [], topList = [];
const bTitle = c => { const x = BK[c[0].dataIndex]; return x ? (x.a == x.b ? fmtY(x.a) : fmt(x.a) + " – " + fmtY(x.b)) : ""; };
const cTrend = mk("cTrend", { data: { labels: [], datasets: [
  { type: "bar", label: "Chi phí", data: [], backgroundColor: "#A5B4FC", borderRadius: 4, yAxisID: "y", order: 2 },
  { type: "line", label: "GMV", data: [], borderColor: "#5D5FEF", backgroundColor: "#5D5FEF22", fill: true, tension: .35, pointRadius: 2, yAxisID: "y", order: 1 },
  { type: "line", label: "ROI", data: [], borderColor: "#3CD856", backgroundColor: "#3CD856", borderDash: [4, 3], tension: .35, pointRadius: 0, yAxisID: "y1", order: 0 }] },
  options: { interaction: { mode: "index", intersect: false }, scales: { x: tX, y: gM, y1: { position: "right", beginAtZero: true, grid: { display: false }, border: { display: false }, ticks: { callback: v => (+v).toFixed(1) } } },
    plugins: { tooltip: { callbacks: { title: bTitle, label: c => c.dataset.label == "ROI" ? "ROI: " + (c.raw ?? 0).toFixed(2) : tipM(c) } } }, onClick: (e, el) => el.length && zoomTo(BK[el[0].index]) } });
const cKenh = mk("cKenh", { type: "bar", data: { labels: KENH, datasets: [{ label: "Chi phí", data: [], borderRadius: 4 }, { label: "GMV", data: [], borderRadius: 4 }] }, options: { scales: { x: gX, y: gM }, plugins: { tooltip: { callbacks: { label: tipM } } }, onClick: (e, el) => el.length && tog("k", KENH[el[0].index]) } });
const cSt = mk("cSt", { type: "doughnut", data: { labels: ST, datasets: [{ data: [], borderWidth: 2, borderColor: "#fff" }] }, options: { cutout: "60%", plugins: { legend: { position: "right", labels: { font: { size: 10 } } } }, onClick: (e, el) => el.length && tog("st", el[0].index) } });
const cCamp = mk("cCamp", { type: "bar", data: { labels: [], datasets: [{ label: "Chi phí", data: [], borderRadius: 4 }, { label: "GMV", data: [], borderRadius: 4 }] }, options: { indexAxis: "y", scales: { y: gX, x: gM }, plugins: { tooltip: { callbacks: { label: tipM } } }, onClick: (e, el) => el.length && tog("c", CAMP[el[0].index]) } });
const cTop = mk("cTop", { type: "bar", data: { labels: [], datasets: [{ data: [], borderRadius: 5 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: gY, y: { ...gX, ticks: { font: { size: 10 } } } }, onClick: (e, el) => el.length && tog("ctv", topList[el[0].index].c) } });
const cSc = mk("cSc", { type: "scatter", data: { datasets: KENH.map((k, i) => ({ label: k, data: [], backgroundColor: KC[i] + "cc", pointRadius: 5, pointHoverRadius: 8 })) },
  options: { scales: { x: gM, y: gM }, plugins: { tooltip: { callbacks: { label: c => c.raw.n + ": CP " + m(c.raw.x) + " · GMV " + m(c.raw.y) } } }, onClick: (e, el) => el.length && tog("ctv", cSc.data.datasets[el[0].datasetIndex].data[el[0].index].c) } });
const cPlan = mk("cPlan", { type: "bar", data: { labels: [], datasets: [{ label: "Kế hoạch", data: [], backgroundColor: "#4AB58E", borderRadius: 3 }, { label: "Thực chi", data: [], backgroundColor: "#FFCF00", borderRadius: 3 }] }, options: { scales: { x: tX, y: gM }, plugins: { tooltip: { callbacks: { title: bTitle, label: tipM } } }, onClick: (e, el) => el.length && zoomTo(BK[el[0].index]) } });
const cOn = mk("cOn", { type: "line", data: { labels: [], datasets: [{ label: "Đúng hạn", data: [], fill: true, tension: .35, borderColor: "#0095FF", backgroundColor: "#0095FF22", pointRadius: 2, spanGaps: true }, { label: "Mục tiêu", data: [], borderDash: [5, 5], borderColor: "#3CD856", pointRadius: 0 }] },
  options: { plugins: { legend: { display: false }, tooltip: { callbacks: { title: bTitle, label: c => c.dataset.label + ": " + (c.raw ?? 0).toFixed(0) + "%" } } }, scales: { x: tX, y: { ...gY, beginAtZero: false, suggestedMin: 60, max: 100, ticks: { callback: v => v + "%" } } }, onClick: (e, el) => el.length && zoomTo(BK[el[0].index]) } });
const cPay = mk("cPay", { type: "doughnut", data: { labels: [ST[2], ST[3], ST[4]], datasets: [{ data: [], backgroundColor: ["#FFCF00", "#FF947A", "#3CD856"], borderColor: "#fff", borderWidth: 2 }] }, options: { cutout: "60%", plugins: { tooltip: { callbacks: { label: c => c.label + ": " + m(c.raw) } } }, onClick: (e, el) => el.length && tog("st", el[0].index + 2) } });

/* ===== 5. Tab Tổng quan ===== */
function perf(A) {
  const M = new Map(); A.forEach(b => { if (!M.has(b.c)) M.set(b.c, []); M.get(b.c).push(b); });
  return [...M].map(([c, b]) => { const co = sum(b, "cost"), v = sum(b, "view"), e = sum(b, "eng"), d = sum(b, "don"), g = sum(b, "gmv");
    return { c, n: b.length, co, v, e, cpv: v ? co / v : 0, cpe: e ? co / e : 0, d, cpo: d ? co / d : 0, g, roi: co ? g / co : 0, tre: b.filter(x => x.tre).length }; });
}
const warn = c => { const w = []; if (c.missing) return ["Không có hồ sơ"]; if (!c.stk) w.push("Thiếu STK"); if (!c.cccd) w.push("Thiếu CCCD"); if (c.dup) w.push("Trùng SĐT"); return w; };
function rTQ() {
  const A = act(flt()), P = act(flt([], prevF())), co = sum(A, "cost"), g = sum(A, "gmv"), pco = sum(P, "cost"), pg = sum(P, "gmv"), cho = flt().filter(b => b.st == 2 || b.st == 3);
  const nC = x => new Set(x.map(b => b.c)).size;
  kpi("kTQ", [["#FFE2E5", "#FA5A7D", "₫", "Chi phí booking", m(co), co, pco, 1, m], ["#DCFCE7", "#3CD856", "$", "GMV", m(g), g, pg, 0, m],
    ["#F3E8FF", "#BF83FF", "%", "ROI", co ? (g / co).toFixed(2) : "—", co ? g / co : null, pco ? pg / pco : null, 0, x => x.toFixed(2)],
    ["#FFF4DE", "#FF947A", "#", "Booking", A.length, A.length, P.length], ["#E0F2FE", "#0095FF", "☺", "CTV có booking", nC(A), nC(A), nC(P)], ["#F1F5F9", "#64748B", "⧗", "Chờ thanh toán", m(sum(cho, "cost")), null, null]]);
  const { B, g: gr } = buckets(); BK = B; $("gran").textContent = gr;
  cTrend.data.labels = B.map(x => x.l); cTrend.data.datasets[0].data = B.map(x => sum(inB(A, x), "cost")); cTrend.data.datasets[1].data = B.map(x => sum(inB(A, x), "gmv"));
  cTrend.data.datasets[2].data = B.map(x => { const a = inB(A, x), c = sum(a, "cost"); return c ? sum(a, "gmv") / c : null; }); cTrend.update();
  const byK = KENH.map(k => act(flt(["k"], { k }))); cKenh.data.datasets[0].data = byK.map(a => sum(a, "cost")); cKenh.data.datasets[1].data = byK.map(a => sum(a, "gmv"));
  cKenh.data.datasets[0].backgroundColor = KENH.map(k => dim("#0095FF", !F.k || F.k == k)); cKenh.data.datasets[1].backgroundColor = KENH.map(k => dim("#00E096", !F.k || F.k == k)); cKenh.update();
  const sA = flt(["st"]); cSt.data.datasets[0].data = ST.map((x, i) => sA.filter(b => b.st == i).length); cSt.data.datasets[0].backgroundColor = STCOL.map((c, i) => dim(c, F.st === null || F.st == i)); cSt.update();
  const byC = CAMP.map(c => act(flt(["c"], { c }))); cCamp.data.labels = CAMP; cCamp.data.datasets[0].data = byC.map(a => sum(a, "cost")); cCamp.data.datasets[1].data = byC.map(a => sum(a, "gmv"));
  cCamp.data.datasets[0].backgroundColor = CAMP.map(c => dim("#FA5A7D", !F.c || F.c == c)); cCamp.data.datasets[1].backgroundColor = CAMP.map(c => dim("#5D5FEF", !F.c || F.c == c)); cCamp.update();
  const AC = act(flt(["ctv"])), pc = perf(AC).sort((a, b) => b.g - a.g).slice(0, 10), tg = sum(AC, "gmv") || 1, mx = pc[0] && pc[0].g ? pc[0].g : 1;
  $("tTop").innerHTML = "<thead><tr><th>#</th><th>CTV</th><th>Tỉ trọng</th><th class=num>GMV</th><th class=num>ROI</th></tr></thead><tbody>" + (pc.length ? pc.map((p, i) =>
    `<tr data-i="${ctv.indexOf(p.c)}" class="${F.ctv === p.c ? "sel" : ""}"><td>${i + 1}</td><td>${esc(p.c.ten)}</td><td><div class="prog"><i style="width:${p.g / mx * 100}%;background:${KC[KENH.indexOf(p.c.kenh)] || "#94a3b8"}"></i></div></td><td class=num>${m(p.g)} <span style="color:#96A5B8">(${(p.g / tg * 100).toFixed(0)}%)</span></td><td class=num><b>${p.roi.toFixed(2)}</b></td></tr>`).join("") : emptyRow(5)) + "</tbody>";
  $("tTop").querySelectorAll("tbody tr[data-i]").forEach(t => t.onclick = () => ctv[t.dataset.i] && tog("ctv", ctv[t.dataset.i]));
  const F0 = flt(), al = [];
  const tre = F0.filter(b => b.tre && b.st < 2).length; if (tre) al.push(["#FFE2E5", "🔴", tre + " booking quá deadline mà chưa đăng"]);
  const low = perf(A).filter(p => p.roi < 1).length; if (low) al.push(["#FFF4DE", "🟠", low + " CTV có ROI dưới 1"]);
  const miss = ctv.filter(c => !c.stk || !c.cccd).length; if (miss) al.push(["#FFF4DE", "🟠", miss + " CTV thiếu STK hoặc CCCD"]);
  const dup = ctv.filter(c => c.dup); if (dup.length) al.push(["#FFF4DE", "🟠", "CTV trùng SĐT: " + dup.slice(0, 4).map(c => c.id).join(", ") + (dup.length > 4 ? "…" : "")]);
  const nos = bk.filter(b => b.c.missing).length; if (nos) al.push(["#FFE2E5", "🔴", nos + " booking có mã CTV không tồn tại"]);
  const ds = recon(); const bad = ds.L.length; if (bad) al.push(["#F3E8FF", "🟣", bad + " dòng lệch khi đối soát kế toán"]);
  $("alerts").innerHTML = al.length ? al.map(a => `<div class="al" style="background:${a[0]}">${a[1]} ${esc(a[2])}</div>`).join("") : `<div class="empty">Không có việc cần xử lý</div>`;
}

/* ===== 6. Tab CTV & Booking ===== */
["q", "fT", "fW"].forEach(i => $(i).oninput = rCB);
function rCB() {
  const B = flt(["ctv", "st"]), P = flt(["ctv", "st"], prevF()), q = $("q").value.toLowerCase(), ft = $("fT").value, fw = $("fW").checked, cnt = new Map();
  B.forEach(b => cnt.set(b.c, (cnt.get(b.c) || 0) + 1));
  const nC = x => new Set(x.map(b => b.c)).size, posted = x => x.filter(b => b.st >= 1 && b.st < 5).length, late = x => x.filter(b => b.tre && b.st < 2).length, cc = x => x.filter(b => b.st == 5).length;
  kpi("kCB", [["#E0F2FE", "#0095FF", "☺", "CTV active", ctv.filter(c => c.tt == "Active").length, null, null], ["#DCFCE7", "#3CD856", "+", "CTV có booking", nC(B), nC(B), nC(P)],
    ["#FFF4DE", "#FF947A", "#", "Booking mới", B.length, B.length, P.length], ["#F3E8FF", "#BF83FF", "✓", "Đã đăng", posted(B), posted(B), posted(P)],
    ["#FFE2E5", "#FA5A7D", "!", "Trễ hạn chưa đăng", late(B), late(B), late(P), 1], ["#F1F5F9", "#64748B", "×", "Huỷ", cc(B), cc(B), cc(P), 1]]);
  const L = ctv.filter(c => (!F.k || c.kenh == F.k) && (!F.n || c.ns == F.n) && (!q || (c.id + c.ten + c.sdt).toLowerCase().includes(q)) && (!ft || c.tt == ft) && (!fw || warn(c).length))
    .sort((a, b) => (cnt.get(b) || 0) - (cnt.get(a) || 0));
  $("nCtv").textContent = L.length;
  $("tCtv").innerHTML = "<thead><tr><th>Mã</th><th>Họ tên</th><th>Kênh</th><th class=num>Booking</th><th>Trạng thái</th><th>Cảnh báo</th></tr></thead><tbody>" + (L.length ? L.slice(0, 500).map(c =>
    `<tr data-i="${ctv.indexOf(c)}" class="${F.ctv === c ? "sel" : ""}"><td>${esc(c.id)}</td><td>${esc(c.ten)}</td><td>${esc(c.kenh)}</td><td class=num>${cnt.get(c) || 0}</td><td><span class="tag ${c.tt == "Active" ? "t-ok" : c.tt == "Tạm dừng" ? "t-warn" : "t-bad"}">${esc(c.tt)}</span></td><td>${warn(c).map(x => `<span class="tag t-bad">${x}</span>`).join(" ")}</td></tr>`).join("") : emptyRow(6, ctv.length ? "Không có CTV khớp bộ lọc" : "Chưa có CTV nào")) + "</tbody>";
  $("tCtv").querySelectorAll("tbody tr[data-i]").forEach(t => t.onclick = () => tog("ctv", ctv[t.dataset.i]));
  const BS = flt(["st"]);
  $("chips").innerHTML = `<span class="chip ${F.st === null ? "on" : ""}" data-i="">Tất cả ${BS.length}</span>` + ST.map((x, i) => `<span class="chip ${F.st === i ? "on" : ""}" data-i="${i}">${x} ${BS.filter(b => b.st == i).length}</span>`).join("");
  $("chips").querySelectorAll(".chip").forEach(c => c.onclick = () => { if (c.dataset.i === "") { F.st = null; renderAll(); } else tog("st", +c.dataset.i); });
  const BB = flt(), c = F.ctv;
  $("bkT").innerHTML = (c ? "Booking của " + esc(c.ten) : "Booking") + ` <span class="tag t-mute">${BB.length}</span>`;
  $("prof").innerHTML = c ? `<div class="prof"><span>Mã <b>${esc(c.id)}</b></span><span>SĐT <b>${esc(c.sdt)}</b></span><span>Kênh <b>${esc(c.kenh)}</b></span><span>Follower <b>${vnd(c.fl)}</b></span><span>Ngành <b>${esc(c.nganh)}</b></span><span>Rate <b>${vnd(c.rate)}</b></span><span>Phụ trách <b>${esc(c.ns)}</b></span></div>` : "";
  $("tBk").innerHTML = "<thead><tr><th>Mã</th>" + (c ? "" : "<th>CTV</th>") + "<th>Chiến dịch</th><th>Ngày</th><th class=num>Chi phí</th><th class=num>View</th><th class=num>GMV</th><th>Trạng thái</th></tr></thead><tbody>" +
    (BB.length ? BB.slice(0, 300).map(b => `<tr><td>${esc(b.id)}</td>${c ? "" : `<td>${esc(b.c.ten)}</td>`}<td>${esc(b.camp)}</td><td>${fmt(b.day)}</td><td class=num>${vnd(b.cost)}</td><td class=num>${vnd(b.view)}</td><td class=num>${vnd(b.gmv)}</td><td><span class="tag ${STC[b.st]}">${ST[b.st]}</span>${b.tre && b.st < 2 ? ' <span class="tag t-bad">Trễ</span>' : ""}</td></tr>`).join("") : emptyRow(8)) + "</tbody>";
}

/* ===== 7. Tab Hiệu suất ===== */
const agg = A => { const co = sum(A, "cost"), v = sum(A, "view"), e = sum(A, "eng"), d = sum(A, "don"), g = sum(A, "gmv"), p = A.filter(b => b.st >= 1);
  return { co, cpv: v ? co / v : null, cpe: e ? co / e : null, cpo: d ? co / d : null, roi: co ? g / co : null, on: p.length ? 100 - p.filter(b => b.tre).length / p.length * 100 : null }; };
let sk = "roi", sd = -1; $("hMet").onchange = rHS;
function rHS() {
  const A = act(flt()), Pp = act(flt([], prevF())), a = agg(A), p = agg(Pp), pf = prevF(), pl = planOf(F.from, F.to), ppl = planOf(pf.from, pf.to);
  kpi("kHS", [["#F3E8FF", "#BF83FF", "%", "ROI", a.roi != null ? a.roi.toFixed(2) : "—", a.roi, p.roi, 0, x => x.toFixed(2)],
    ["#E0F2FE", "#0095FF", "👁", "CPV (chi phí/view)", a.cpv ? vnd(a.cpv) + "đ" : "—", a.cpv, p.cpv, 1, vnd], ["#FFF4DE", "#FF947A", "♥", "CPE (chi phí/tương tác)", a.cpe ? vnd(a.cpe) + "đ" : "—", a.cpe, p.cpe, 1, vnd],
    ["#FFE2E5", "#FA5A7D", "🛒", "CPO (chi phí/đơn)", a.cpo ? vnd(a.cpo) + "đ" : "—", a.cpo, p.cpo, 1, vnd], ["#DCFCE7", "#3CD856", "⏱", "Đăng đúng hạn", a.on != null ? a.on.toFixed(1) + "%" : "—", a.on, p.on, 0, x => x.toFixed(1) + "%"],
    ["#FEF9C3", "#CA8A04", "₫", "Thực chi / kế hoạch", pl ? (a.co / pl * 100).toFixed(0) + "%" : "Chưa có KH", pl ? a.co / pl * 100 : null, ppl ? sum(Pp, "cost") / ppl * 100 : null, 1, x => x.toFixed(0) + "%"]]);
  const P = perf(A), met = $("hMet").value, fm = v => met == "roi" ? (+v).toFixed(2) : met == "g" ? m(v) : vnd(v);
  topList = [...P].sort((x, y) => y[met] - x[met]).slice(0, 10);
  cTop.data.labels = topList.map(x => x.c.ten); cTop.data.datasets[0].data = topList.map(x => x[met]); cTop.data.datasets[0].backgroundColor = topList.map(x => dim(KC[KENH.indexOf(x.c.kenh)] || "#94a3b8", !F.ctv || F.ctv === x.c));
  cTop.options.scales.x.ticks = { callback: fm }; cTop.options.plugins.tooltip = { callbacks: { label: c => fm(c.raw) } }; cTop.update();
  const PA = perf(act(flt(["ctv"])));
  cSc.data.datasets.forEach((d, i) => { d.data = PA.filter(x => x.c.kenh == KENH[i]).map(x => ({ x: x.co, y: x.g, n: x.c.ten, c: x.c })); d.pointBackgroundColor = d.data.map(x => dim(KC[i], !F.ctv || F.ctv === x.c)); d.pointRadius = d.data.map(x => F.ctv === x.c ? 9 : 5); }); cSc.update();
  const { B } = buckets(); BK = B; const TP = flt().filter(b => b.st >= 1 && b.st < 5);
  cPlan.data.labels = B.map(x => x.l); cPlan.data.datasets[0].data = B.map(x => planOf(x.a, x.b)); cPlan.data.datasets[1].data = B.map(x => sum(inB(A, x), "cost")); cPlan.update();
  $("planLeg").innerHTML = pl ? `Kế hoạch <b>${m(pl)}</b> · Thực chi <b>${m(a.co)}</b> (${(a.co / pl * 100).toFixed(0)}%)` : `Chưa nhập ngân sách (sửa trong config.js) · Thực chi <b>${m(a.co)}</b>`;
  cOn.data.labels = B.map(x => x.l); cOn.data.datasets[0].data = B.map(x => { const q = inB(TP, x); return q.length >= 3 ? 100 - q.filter(b => b.tre).length / q.length * 100 : null; });
  cOn.data.datasets[1].data = B.map(() => CFG.mucTieuDungHan); cOn.update();
  const cols = [["c", "CTV", x => esc(x.c.ten)], ["k", "Kênh", x => esc(x.c.kenh)], ["n", "Booking", x => x.n], ["co", "Chi phí", x => vnd(x.co)], ["v", "View", x => vnd(x.v)], ["cpv", "CPV", x => vnd(x.cpv)], ["cpe", "CPE", x => vnd(x.cpe)], ["d", "Đơn", x => x.d], ["cpo", "CPO", x => vnd(x.cpo)], ["g", "GMV", x => vnd(x.g)], ["roi", "ROI", x => x.roi.toFixed(2)], ["tre", "Trễ", x => x.tre]], txt = k => k == "c" || k == "k";
  const D = [...PA].sort((x, y) => txt(sk) ? 0 : (x[sk] - y[sk]) * sd);
  $("tHs").innerHTML = "<thead><tr>" + cols.map(c => `<th class="${txt(c[0]) ? "" : "num"}" style="cursor:pointer" data-k="${c[0]}">${c[1]}${sk == c[0] ? (sd < 0 ? " ↓" : " ↑") : ""}</th>`).join("") + "<th>Cờ</th></tr></thead><tbody>" +
    (D.length ? D.map(x => `<tr data-i="${ctv.indexOf(x.c)}" class="${F.ctv === x.c ? "sel" : ""}">` + cols.map(c => `<td class="${txt(c[0]) ? "" : "num"}">${c[2](x)}</td>`).join("") + `<td>${x.roi < 1 || x.tre >= 2 ? '<span class="tag t-bad">Xem lại</span>' : ""}</td></tr>`).join("") : emptyRow(13)) + "</tbody>";
  $("tHs").querySelectorAll("th[data-k]").forEach(t => t.onclick = () => { sd = sk == t.dataset.k ? -sd : -1; sk = t.dataset.k; rHS(); });
  $("tHs").querySelectorAll("tbody tr[data-i]").forEach(t => t.onclick = () => ctv[t.dataset.i] && tog("ctv", ctv[t.dataset.i]));
}

/* ===== 8. Tab Đối soát kế toán =====
   Quy tắc: so khớp booking (đã nghiệm thu trở đi) với dữ liệu thanh toán của kế toán theo mã booking.
   - Lệch số tiền: tổng kế toán chi khác chi phí booking
   - Chi trùng: một booking có từ 2 dòng thanh toán
   - Thiếu bên KT: booking ghi "Đã thanh toán" nhưng kế toán không có dòng nào
   - Thiếu bên Booking: kế toán có dòng chi nhưng không tìm thấy booking, hoặc booking chưa nghiệm thu */
function recon() {
  const nt = flt(["st"]).filter(b => b.st >= 2 && b.st <= 4), ids = new Set(nt.map(b => b.id)), byB = new Map();
  tt.forEach(x => { if (!byB.has(x.maBooking)) byB.set(x.maBooking, []); byB.get(x.maBooking).push(x); });
  const all = new Map(bk.map(b => [b.id, b])), L = [];
  nt.forEach(b => {
    const k = byB.get(b.id) || [], s = k.reduce((a, x) => a + (+x.soTien || 0), 0);
    if (k.length > 1) L.push([b, "Chi trùng", s, `Kế toán có ${k.length} dòng chi cho booking này`]);
    else if (k.length == 1 && s != b.cost) L.push([b, "Lệch số tiền", s, s < b.cost ? "Kế toán ghi thiếu" : "Kế toán ghi dư"]);
    else if (!k.length && b.st == 4) L.push([b, "Thiếu bên KT", null, "Booking ghi đã thanh toán, kế toán chưa ghi nhận"]);
  });
  byB.forEach((k, id) => {
    const b = all.get(id);
    if (!b) { if (F.from <= TODAY) L.push([{ id, c: { ten: "—" }, day: fromIso(k[0].ngayTT) ?? TODAY, cost: null }, "Thiếu bên Booking", k.reduce((a, x) => a + (+x.soTien || 0), 0), "Không tìm thấy mã booking này"]); }
    else if (b.st < 2 && ids.size >= 0 && b.day >= F.from && b.day <= F.to) L.push([b, "Thiếu bên Booking", k.reduce((a, x) => a + (+x.soTien || 0), 0), "Kế toán đã chi nhưng booking chưa nghiệm thu"]);
  });
  return { nt, L };
}
function rDS() {
  const { nt, L } = recon(), tot = sum(nt, "cost"), n = t => L.filter(x => x[1] == t).length;
  kpi("kDS", [["#F1F5F9", "#64748B", "Σ", "Booking cần đối soát", nt.length, null, null], ["#DCFCE7", "#3CD856", "✓", "Không lệch", Math.max(0, nt.length - L.filter(x => ids(x)).length), null, null],
    ["#FFF4DE", "#FF947A", "≠", "Lệch số tiền", n("Lệch số tiền"), null, null], ["#FFE2E5", "#FA5A7D", "!", "Thiếu hoặc chi trùng", n("Chi trùng") + n("Thiếu bên KT") + n("Thiếu bên Booking"), null, null],
    ["#F3E8FF", "#BF83FF", "₫", "Tổng tiền đối soát", m(tot), null, null], ["#FEF9C3", "#CA8A04", "⧗", "Chờ thanh toán", m(sum(nt.filter(b => b.st < 4), "cost")), null, null]]);
  function ids(x) { return nt.includes(x[0]); }
  $("tDs").innerHTML = "<thead><tr><th>Mã booking</th><th>CTV</th><th>Ngày</th><th class=num>Booking</th><th class=num>Kế toán</th><th class=num>Chênh lệch</th><th>Loại</th><th>Ghi chú</th></tr></thead><tbody>" +
    (L.length ? L.map(([b, t, kt, g]) => `<tr style="background:${t == "Lệch số tiền" ? "#FFFBF0" : "#FFF5F7"}"><td>${esc(b.id)}</td><td>${esc(b.c.ten)}</td><td>${fmt(b.day)}</td><td class=num>${b.cost == null ? "—" : vnd(b.cost)}</td><td class=num>${kt == null ? "—" : vnd(kt)}</td><td class=num>${kt != null && b.cost != null ? vnd(kt - b.cost) : "—"}</td><td><span class="tag ${t == "Lệch số tiền" ? "t-warn" : "t-bad"}">${t}</span></td><td>${g}</td></tr>`).join("")
      : emptyRow(8, nt.length ? (tt.length ? "Không có dòng lệch" : "Chưa có dữ liệu thanh toán của kế toán để đối soát") : "Chưa có booking cần đối soát trong bộ lọc này")) + "</tbody>";
  cPay.data.datasets[0].data = [2, 3, 4].map(i => sum(nt.filter(b => b.st == i), "cost")); cPay.data.datasets[0].backgroundColor = ["#FFCF00", "#FF947A", "#3CD856"].map((c, i) => dim(c, F.st === null || F.st == i + 2)); cPay.update();
  $("xfNote").innerHTML = `Mọi file sẽ xuất theo bộ lọc đang chọn: <b>${fmtY(F.from)} – ${fmtY(F.to)}</b>${F.k ? " · kênh " + esc(F.k) : ""}${F.c ? " · " + esc(F.c) : ""}${F.n ? " · phụ trách " + esc(F.n) : ""}.`;
}

/* ===== 9. Điều hướng, khởi động ===== */
document.querySelectorAll("[data-soon]").forEach(b => b.onclick = () => toast("Chức năng này sẽ làm ở bước sau"));
document.querySelector("#ds .btn.pri:not([data-soon])")?.addEventListener("click", () => { renderAll(); toast("Đã chạy lại đối soát"); });
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("active", x === b));
  document.querySelectorAll("section").forEach(x => x.classList.toggle("on", x.id == b.dataset.s)); renderAll();
});
function renderAll() { rSlicer(); rTQ(); rCB(); rHS(); rDS(); }
const U = CFG.nguoiDung || {}; $("avN").textContent = U.ten || ""; $("avR").textContent = U.vaiTro || ""; $("avI").textContent = (U.ten || "?")[0];
DEMO = /[?&]demo=1/.test(location.search);
load(DEMO ? window.makeDemoData(TODAY_ISO) : window.KOC_DATA);
setPre(CFG.mocMacDinh || "30");
})();
