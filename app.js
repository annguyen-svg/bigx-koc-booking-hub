/* ==========================================================
   BIGX · KOC BOOKING HUB · app.js
   Logic các tab số liệu. Mục lục:
     1. Tiện ích ngày & số        2. Nạp + chuẩn hoá dữ liệu
     3. Bộ lọc thời gian / kênh    4. Thành phần dùng chung (KPI, nhận định, biểu đồ)
     5. Tổng quan                  6. Hiệu suất CTV
     7. Đối soát                   8. CTV & Booking
     9. Xuất file, điều hướng, khởi động
   Tab "Công việc của tôi" nằm ở tasks.js
   ========================================================== */
(function () {
const CFG = window.KOC_CONFIG, KENH = CFG.kenh, ST = CFG.trangThai, ROI_T = CFG.mucTieuROI || 2, ONT = CFG.mucTieuDungHan || 90, WAIT = CFG.nguongChoThanhToan || 30;
const $ = id => document.getElementById(id);

/* ===== 1. Tiện ích ngày & số ===== */
const D0 = Date.UTC(2020, 0, 1), DAY = 864e5;
const fromIso = s => s ? Math.round((Date.parse(String(s).slice(0, 10) + "T00:00:00Z") - D0) / DAY) : null, dd = i => new Date(D0 + i * DAY), iso = i => dd(i).toISOString().slice(0, 10);
const fmt = i => { const d = dd(i); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0"); };
const n0 = new Date(), TISO = n0.getFullYear() + "-" + String(n0.getMonth() + 1).padStart(2, "0") + "-" + String(n0.getDate()).padStart(2, "0"), TODAY = fromIso(TISO);
const vnd = n => Math.round(n || 0).toLocaleString("vi-VN"), m = n => ((n || 0) / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr";
const pct = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(0) + "%", r2 = x => (x || 0).toFixed(2).replace(".", ",");
const sum = (a, k) => a.reduce((x, b) => x + (+b[k] || 0), 0), act = a => a.filter(b => b.st < 5);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toast = t => { const e = $("toast"); e.textContent = t; e.classList.add("on"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("on"), 2200); };
const groupBy = (a, f) => { const M = new Map(); a.forEach(x => { const k = f(x); if (!M.has(k)) M.set(k, []); M.get(k).push(x); }); return M; };

/* ===== 2. Nạp + chuẩn hoá dữ liệu ===== */
let ctv = [], bk = [], tt = [], PLAN = {}, NS = [], START = TODAY - 365, DEMO = false;
function load(raw) {
  PLAN = raw.nganSachThang || CFG.nganSachThang || {};
  const byMa = new Map();
  ctv = (raw.ctv || []).map(x => { const c = { id: x.ma, ten: x.hoTen || "", sdt: String(x.sdt || "").replace(/\s/g, ""), kenh: x.kenh || "", fl: +x.follower || 0, nganh: x.nganh || "", rate: +x.rateCard || 0,
    stk: !!x.stk, cccd: !!x.cccd, tt: x.trangThai || "Active", ns: x.phuTrach || "" }; byMa.set(c.id, c); return c; });
  const sc = new Map(); ctv.forEach(c => c.sdt && sc.set(c.sdt, (sc.get(c.sdt) || 0) + 1)); ctv.forEach(c => c.dup = !!c.sdt && sc.get(c.sdt) > 1);
  bk = (raw.booking || []).map(x => {
    const c = byMa.get(x.maCTV) || { id: x.maCTV || "?", ten: "(không có hồ sơ)", kenh: "", ns: "", missing: true };
    const st = Math.max(0, ST.indexOf(x.trangThai)), dl = fromIso(x.deadline), dp = fromIso(x.ngayDang);
    return { id: x.ma, c, camp: x.chienDich || "", day: fromIso(x.ngayBook) ?? TODAY, st, cost: +x.chiPhi || 0, view: +x.view || 0, don: +x.don || 0, gmv: +x.gmv || 0,
      posted: st >= 1 && st < 5, tre: dl != null && ((dp != null && dp > dl) || (dp == null && st < 2 && TODAY > dl)), late0: dp == null && st < 2 && dl != null && TODAY > dl };
  }).sort((a, b) => b.day - a.day);
  tt = raw.thanhToan || [];
  NS = [...new Set(ctv.map(c => c.ns).filter(Boolean))];
  START = bk.length ? Math.min(...bk.map(b => b.day)) : TODAY - 365;
  $("fN").innerHTML = '<option value="">Tất cả phụ trách</option>' + NS.map(x => `<option>${esc(x)}</option>`).join("");
  $("dF").min = $("dT").min = iso(START); $("dF").max = $("dT").max = iso(TODAY);
  const e = $("status");
  if (DEMO) { e.className = "status demo"; e.innerHTML = `Đang xem DATA MẪU (giả) để thử giao diện. <button id="stB">Tắt data mẫu</button>`; }
  else if (!bk.length && !ctv.length) { e.className = "status"; e.innerHTML = `Chưa có dữ liệu, web đang ở trạng thái trống. <button id="stB">Xem data mẫu</button>`; }
  else { e.className = "status"; e.innerHTML = `Dữ liệu: ${ctv.length} CTV · ${bk.length} booking`; }
  if ($("stB")) $("stB").onclick = () => { DEMO = !DEMO; load(DEMO ? window.makeDemoData(TISO) : window.KOC_DATA); Object.assign(S, { k: "", n: "" }); selCtv = null; setPre(CFG.mocMacDinh || "30"); };
}

/* ===== 3. Bộ lọc ===== */
const S = { from: TODAY - 29, to: TODAY, pre: "30", k: "", n: "" };
const sel = (o = {}) => { const f = { ...S, ...o }; return bk.filter(b => b.day >= f.from && b.day <= f.to && (!f.k || b.c.kenh == f.k) && (!f.n || b.c.ns == f.n)); };
const prev = () => { const L = S.to - S.from + 1; return { from: S.from - L, to: S.from - 1 }; };
function setPre(p) { S.pre = p; if (p == "all") S.from = START; else if (p == "m") S.from = fromIso(TISO.slice(0, 8) + "01"); else S.from = TODAY - (+p) + 1; S.to = TODAY; render(); }
$("pre").querySelectorAll("span").forEach(e => e.onclick = () => setPre(e.dataset.p));
$("dF").onchange = e => { if (!e.target.value) return; S.from = fromIso(e.target.value); if (S.from > S.to) S.to = S.from; S.pre = ""; render(); };
$("dT").onchange = e => { if (!e.target.value) return; S.to = Math.min(TODAY, fromIso(e.target.value)); if (S.to < S.from) S.from = S.to; S.pre = ""; render(); };
KENH.forEach(x => $("fK").innerHTML += `<option>${esc(x)}</option>`);
$("fK").onchange = e => { S.k = e.target.value; render(); }; $("fN").onchange = e => { S.n = e.target.value; render(); };
function planOf(a, b) { let t = 0; for (let d = a; d <= b; d++) { const x = dd(d), mo = PLAN[x.toISOString().slice(0, 7)]; if (!mo) continue; const days = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate(); KENH.forEach(k => { if (!S.k || S.k == k) t += (+mo[k] || 0) / days; }); } return t; }
function buckets() { const L = S.to - S.from + 1, step = L <= 31 ? 1 : L <= 120 ? 7 : 30, B = []; for (let d = S.from; d <= S.to; d += step) B.push({ a: d, b: Math.min(d + step - 1, S.to) }); return { B, g: step == 1 ? "Theo ngày" : step == 7 ? "Theo tuần" : "Theo 30 ngày" }; }

/* ===== 4. Thành phần dùng chung ===== */
function kpis(id, L) { $(id).innerHTML = L.map(k => `<div class="kpi"><div class="l">${k.l}</div><div class="v">${k.v}</div><div class="d">${k.c ? `<span class="chg ${k.good ? "g" : "b"}">${k.c}</span>` : ""}<span>${k.s || ""}</span></div>${k.meter != null ? `<div class="meter"><i style="width:${Math.max(0, Math.min(100, k.meter))}%;background:${k.mc || "#0F172A"}"></i></div>` : ""}</div>`).join(""); }
const chg = (c, p, inv) => p ? { c: pct((c - p) / Math.abs(p) * 100), good: ((c - p) >= 0) !== !!inv } : {};
const ins = (id, L) => $(id).innerHTML = `<div class="t">Nhận định tự động</div>` + (L.length ? L.map(x => `<p class="${x[0]}">${x[1]}</p>`).join("") : `<p>Chưa có dữ liệu để nhận định.</p>`);
const roiOf = a => { const c = sum(act(a), "cost"); return c ? sum(act(a), "gmv") / c : 0; };
const onOf = a => { const p = a.filter(b => b.posted); return p.length ? 100 - p.filter(b => b.tre).length / p.length * 100 : 0; };
const emptyRow = (n, t) => `<tr><td colspan="${n}" class="empty">${t || "Chưa có dữ liệu trong khoảng thời gian này"}</td></tr>`;
const F = "Inter,system-ui,sans-serif", C = {}, RO = new ResizeObserver(es => es.forEach(e => C[e.target.id] && C[e.target.id].resize()));
const ec = id => C[id] || (RO.observe($(id)), C[id] = echarts.init($(id)));
const TIP = { backgroundColor: "#0F172A", borderWidth: 0, padding: [8, 12], textStyle: { color: "#fff", fontFamily: F, fontSize: 12 }, extraCssText: "border-radius:8px" };
const AX = { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#94A3B8", fontFamily: F, fontSize: 11 }, splitLine: { lineStyle: { color: "#F1F3F5" } } };
const ANI = { animationDuration: 700, animationEasing: "cubicOut", animationDurationUpdate: 500 };
const LEG = { top: 0, left: 0, icon: "roundRect", itemWidth: 10, itemHeight: 4, textStyle: { fontFamily: F, fontSize: 11.5, color: "#64748B" } };
const emptyChart = id => ec(id).setOption({ graphic: [{ type: "text", left: "center", top: "middle", style: { text: "Chưa có dữ liệu", fill: "#94A3B8", font: "500 13px Inter,system-ui" } }], series: [] }, true);
const trM = v => (v / 1e6).toLocaleString("vi-VN") + "tr";

/* ===== 5. Tổng quan ===== */
function todos() { // danh sách "Việc cần xử lý", dùng cho Tổng quan và tab Công việc
  const A = sel(), G = groupBy(act(A), b => b.c);
  const loss = [...G].filter(([c, x]) => sum(x, "gmv") < sum(x, "cost")).map(([c, x]) => ({ n: c.ten, v: sum(x, "cost") - sum(x, "gmv") })).sort((a, b) => b.v - a.v);
  const late = A.filter(b => b.late0), pend = bk.filter(b => (b.st == 2 || b.st == 3) && TODAY - b.day > WAIT), miss = [...G.keys()].filter(c => !c.missing && (!c.stk || !c.cccd)), R = recon().L;
  return [
    { sev: "#B91C1C", t: "Booking quá deadline chưa đăng", n: late.length, imp: m(sum(late, "cost")) + " đã chốt", act: "Nhắc CTV đăng bài, quá 3 ngày cân nhắc huỷ", nhom: "Booking", items: late.map(b => `${b.id} · ${b.c.ten} · book ${fmt(b.day)}`) },
    { sev: "#B91C1C", t: "CTV đang lỗ (ROI dưới 1)", n: loss.length, imp: "lỗ " + m(sum(loss, "v")), act: "Đàm phán lại giá hoặc ngừng booking kỳ sau", nhom: "Booking", items: loss.map(x => `${x.n} · lỗ ${m(x.v)}`) },
    { sev: "#B45309", t: `Chờ thanh toán quá ${WAIT} ngày`, n: pend.length, imp: m(sum(pend, "cost")), act: "Gửi danh sách cho kế toán", nhom: "Kế toán", items: pend.map(b => `${b.id} · ${b.c.ten} · ${TODAY - b.day} ngày`) },
    { sev: "#B45309", t: "Khoản lệch với kế toán", n: R.length, imp: R.length ? "xem tab Đối soát" : "", act: "Gửi kế toán xác nhận", nhom: "Kế toán", items: R.map(x => `${x.id} · ${x.type}`) },
    { sev: "#64748B", t: "CTV có booking nhưng thiếu STK/CCCD", n: miss.length, imp: "—", act: "Bổ sung hồ sơ trước kỳ thanh toán", nhom: "Nhân sự", items: miss.map(c => `${c.id} · ${c.ten}`) }
  ].filter(x => x.n);
}
function rTQ() {
  const A = sel(), P = sel(prev()), co = sum(act(A), "cost"), pco = sum(act(P), "cost"), g = sum(act(A), "gmv"), pg = sum(act(P), "gmv"), roi = roiOf(A), proi = roiOf(P), on = onOf(A), pon = onOf(P), plan = planOf(S.from, S.to);
  kpis("kTQ", [{ l: "Chi phí booking", v: m(co), ...chg(co, pco, 1), s: plan ? `${(co / plan * 100).toFixed(0)}% ngân sách kỳ` : "chưa nhập ngân sách", meter: plan ? co / plan * 100 : null, mc: co > plan ? "#B91C1C" : "#0F172A" },
    { l: "GMV mang về", v: m(g), ...chg(g, pg), s: "so với kỳ trước" },
    { l: "ROI", v: co ? r2(roi) : "—", ...chg(roi, proi), s: `mục tiêu ${r2(ROI_T)}`, meter: roi / (ROI_T * 1.5) * 100, mc: roi >= ROI_T ? "#047857" : "#B45309" },
    { l: "Đăng đúng hạn", v: A.some(b => b.posted) ? on.toFixed(1).replace(".", ",") + "%" : "—", ...chg(on, pon), s: `mục tiêu ${ONT}%`, meter: on, mc: on >= ONT ? "#047857" : "#B45309" }]);
  const { B, g: gr } = buckets(); $("gran").textContent = gr;
  if (!act(A).length) { emptyChart("cTrend"); emptyChart("cKenh"); ins("iTrend", []); ins("iKenh", []); }
  else {
    const inB = x => act(A).filter(b => b.day >= x.a && b.day <= x.b), cs = B.map(x => sum(inB(x), "cost")), gs = B.map(x => sum(inB(x), "gmv"));
    ec("cTrend").setOption({ ...ANI, grid: { left: 48, right: 12, top: 30, bottom: 24 }, legend: LEG,
      tooltip: { ...TIP, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: "#CBD5E1" } }, formatter: p => { const i = p[0].dataIndex, x = B[i]; return `<b>${x.a == x.b ? fmt(x.a) : fmt(x.a) + "–" + fmt(x.b)}</b><br>Chi phí: ${m(cs[i])}<br>GMV: ${m(gs[i])}<br>ROI: ${cs[i] ? r2(gs[i] / cs[i]) : "—"}`; } },
      xAxis: { type: "category", data: B.map(x => fmt(x.a)), ...AX, splitLine: { show: false } }, yAxis: { type: "value", ...AX, axisLabel: { ...AX.axisLabel, formatter: trM } },
      series: [{ name: "Chi phí", type: "bar", data: cs, barMaxWidth: 14, itemStyle: { color: "#CBD5E1", borderRadius: [3, 3, 0, 0] } },
        { name: "GMV", type: "line", data: gs, smooth: .3, symbol: "circle", symbolSize: 5, showSymbol: false, lineStyle: { width: 2.5, color: "#1D4ED8" }, itemStyle: { color: "#1D4ED8" },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "#1D4ED81f" }, { offset: 1, color: "#1D4ED800" }]) } }] }, true);
    const dG = KENH.map(k => ({ k, d: sum(act(A.filter(b => b.c.kenh == k)), "gmv") - sum(act(P.filter(b => b.c.kenh == k)), "gmv") })).sort((a, b) => (g >= pg ? b.d - a.d : a.d - b.d));
    const gc = pg ? (g - pg) / pg * 100 : null, cc = pco ? (co - pco) / pco * 100 : null, pk = gs.indexOf(Math.max(...gs)), L = [];
    if (gc == null) L.push(["", `GMV đạt <b>${m(g)}</b>; kỳ trước chưa có dữ liệu để so sánh.`]);
    else L.push([gc >= 0 ? "g" : "b", `GMV đạt <b>${m(g)}</b>, ${gc >= 0 ? "tăng" : "giảm"} <b>${Math.abs(gc).toFixed(0)}%</b> so với kỳ trước; ${gc >= 0 ? "tăng" : "giảm"} nhiều nhất ở <b>${dG[0].k}</b> (${dG[0].d >= 0 ? "+" : "−"}${m(Math.abs(dG[0].d))}).`]);
    if (cc != null && gc != null) L.push(cc > gc + 5 ? ["b", `Chi phí tăng <b>${cc.toFixed(0)}%</b>, nhanh hơn GMV, nên ROI giảm từ <b>${r2(proi)}</b> xuống <b>${r2(roi)}</b>.`] : ["g", `Chi phí ${cc >= 0 ? "tăng" : "giảm"} <b>${Math.abs(cc).toFixed(0)}%</b>, không nhanh hơn GMV; ROI ở mức <b>${r2(roi)}</b>.`]);
    if (plan && co > plan) L.push(["b", `Chi phí đã vượt ngân sách kỳ <b>${m(co - plan)}</b>.`]);
    if (B[pk]) L.push(["", `Mốc GMV cao nhất: <b>${fmt(B[pk].a)}</b> với ${m(gs[pk])}.`]);
    ins("iTrend", L);
    const KR = KENH.map(k => { const a = A.filter(b => b.c.kenh == k); return { k, roi: roiOf(a), co: sum(act(a), "cost") }; }).filter(x => x.co).sort((a, b) => b.roi - a.roi);
    ec("cKenh").setOption({ ...ANI, grid: { left: 74, right: 40, top: 6, bottom: 18 }, tooltip: { ...TIP, trigger: "item", formatter: p => `<b>${p.name}</b><br>ROI: ${r2(p.value)}<br>Chi phí: ${m(KR[p.dataIndex].co)}` },
      xAxis: { type: "value", ...AX, axisLabel: { ...AX.axisLabel, formatter: v => r2(v) } }, yAxis: { type: "category", inverse: true, data: KR.map(x => x.k), ...AX, axisLabel: { ...AX.axisLabel, color: "#334155", fontSize: 12 } },
      series: [{ type: "bar", data: KR.map(x => ({ value: +x.roi.toFixed(2), itemStyle: { color: x.roi >= ROI_T ? "#1D4ED8" : "#F59E0B" } })), barWidth: 14, itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", fontFamily: F, fontSize: 11.5, color: "#334155", fontWeight: 600, formatter: p => r2(p.value) },
        markLine: { symbol: "none", silent: true, lineStyle: { color: "#0F172A", type: "dashed", width: 1 }, label: { show: false }, data: [{ xAxis: ROI_T }] } }] }, true);
    const tc = co || 1, best = KR[0], worst = KR[KR.length - 1], under = KR.filter(x => x.roi < ROI_T);
    const lowC = [...groupBy(act(A).filter(b => b.c.kenh == worst.k), b => b.c).values()].filter(x => sum(x, "gmv") < sum(x, "cost")).length;
    ins("iKenh", [["g", `<b>${best.k}</b> hiệu quả nhất (ROI ${r2(best.roi)}), chiếm ${(best.co / tc * 100).toFixed(0)}% chi phí.`],
      under.length ? ["w", `${under.map(x => "<b>" + x.k + "</b>").join(", ")} dưới mục tiêu ROI ${r2(ROI_T)}.`] : ["g", `Tất cả kênh đạt mục tiêu ROI ${r2(ROI_T)}.`],
      lowC ? ["b", `<b>${worst.k}</b> có <b>${lowC} CTV</b> đang lỗ (ROI dưới 1), nên xem lại giá hoặc giảm booking.`] : ["", `${worst.k} thấp nhất nhưng không có CTV lỗ.`]]);
  }
  const T = todos();
  $("tTodo").innerHTML = `<thead><tr><th>Vấn đề</th><th class=num>Số lượng</th><th class=num>Ảnh hưởng</th><th>Đề xuất xử lý</th></tr></thead><tbody>` + (T.length ?
    T.map((x, i) => `<tr class="x" data-i="${i}"><td><span class="caret">›</span><span class="sev" style="background:${x.sev}"></span>${x.t}</td><td class=num><b>${x.n}</b></td><td class=num>${x.imp}</td><td style="color:#475569">${x.act}</td></tr>` +
      x.items.slice(0, 8).map(s => `<tr class="sub" data-p="${i}" style="display:none"><td colspan="4">${esc(s)}</td></tr>`).join("") + (x.items.length > 8 ? `<tr class="sub" data-p="${i}" style="display:none"><td colspan="4">… và ${x.items.length - 8} mục khác</td></tr>` : "")).join("")
    : emptyRow(4, bk.length ? "Không có việc cần xử lý" : "Chưa có dữ liệu")) + "</tbody>";
  $("tTodo").querySelectorAll("tr.x").forEach(t => t.onclick = () => { t.classList.toggle("open"); $("tTodo").querySelectorAll(`tr[data-p="${t.dataset.i}"]`).forEach(r => r.style.display = t.classList.contains("open") ? "" : "none"); });
}

/* ===== 6. Hiệu suất CTV ===== */
let grp = "";
const GR = { "Chủ lực": ["t-n", "#1D4ED8", "Duy trì"], "Tiềm năng": ["t-g", "#047857", "Tăng booking"], "Cần xem lại": ["t-b", "#B91C1C", "Đàm phán / giảm"], "Theo dõi": ["t-m", "#94A3B8", "Theo dõi thêm"] };
function rHS() {
  const A = sel(), P = sel(prev()), G = groupBy(act(A), b => b.c);
  const R = [...G].map(([c, x]) => ({ c, n: x.length, co: sum(x, "cost"), g: sum(x, "gmv"), roi: sum(x, "cost") ? sum(x, "gmv") / sum(x, "cost") : 0, on: onOf(x) }));
  const cs = R.map(r => r.co).sort((a, b) => a - b), med = cs[Math.floor(cs.length / 2)] || 0;
  R.forEach(r => r.gr = r.roi >= ROI_T ? (r.co >= med ? "Chủ lực" : "Tiềm năng") : (r.co >= med ? "Cần xem lại" : "Theo dõi"));
  const tg = sum(R, "g") || 1, sh3 = sum([...R].sort((a, b) => b.g - a.g).slice(0, 3), "g") / tg * 100, nP = new Set(act(P).map(b => b.c)).size;
  const don = sum(act(A), "don"), cpo = don ? sum(act(A), "cost") / don : 0, pdon = sum(act(P), "don"), pcpo = pdon ? sum(act(P), "cost") / pdon : 0, under = R.filter(r => r.roi < ROI_T).length;
  kpis("kHS", [{ l: "CTV có booking", v: R.length, ...chg(R.length, nP), s: "so với kỳ trước" }, { l: "Chi phí / đơn (CPO)", v: cpo ? vnd(cpo) + "đ" : "—", ...chg(cpo, pcpo, 1), s: "so với kỳ trước" },
    { l: "Top 3 CTV chiếm", v: R.length ? sh3.toFixed(0) + "% GMV" : "—", s: sh3 > 35 ? "mức phụ thuộc cao" : "phân bổ ổn", meter: R.length ? sh3 : null, mc: sh3 > 35 ? "#B45309" : "#047857" },
    { l: "CTV dưới mục tiêu ROI", v: under, s: `trên ${R.length} CTV`, meter: R.length ? under / R.length * 100 : null, mc: "#B45309" }]);
  if (!R.length) { emptyChart("cMx"); ins("iMx", []); }
  else {
    ec("cMx").setOption({ ...ANI, grid: { left: 44, right: 16, top: 24, bottom: 34 }, legend: { ...LEG, icon: "circle", itemWidth: 8, itemHeight: 8 },
      tooltip: { ...TIP, trigger: "item", formatter: p => `<b>${esc(p.data[2])}</b><br>Chi phí: ${m(p.data[0])}<br>ROI: ${r2(p.data[1])}<br>${p.seriesName} → ${GR[p.seriesName][2]}` },
      xAxis: { type: "value", name: "Chi phí", nameLocation: "middle", nameGap: 22, nameTextStyle: { color: "#94A3B8", fontFamily: F, fontSize: 11 }, ...AX, axisLabel: { ...AX.axisLabel, formatter: trM } },
      yAxis: { type: "value", name: "ROI", nameTextStyle: { color: "#94A3B8", fontFamily: F, fontSize: 11 }, ...AX },
      series: Object.keys(GR).map((k, i) => ({ name: k, type: "scatter", symbolSize: 9, data: R.filter(r => r.gr == k).map(r => [r.co, +r.roi.toFixed(2), r.c.ten]), itemStyle: { color: GR[k][1], opacity: .85 },
        markLine: i ? undefined : { symbol: "none", silent: true, lineStyle: { color: "#CBD5E1", type: "dashed" }, label: { show: false }, data: [{ yAxis: ROI_T }, { xAxis: med }] } })) }, true);
    const by = k => R.filter(r => r.gr == k), pot = by("Tiềm năng").sort((a, b) => b.roi - a.roi), bad = by("Cần xem lại").sort((a, b) => a.roi - b.roi);
    ins("iMx", [pot.length ? ["g", `<b>${pot.length} CTV tiềm năng</b> (ROI cao, chi phí thấp), nên tăng booking: ${pot.slice(0, 3).map(r => "<b>" + esc(r.c.ten) + "</b>").join(", ")}.`] : ["", "Chưa có CTV tiềm năng trong kỳ."],
      bad.length ? ["b", `<b>${bad.length} CTV cần xem lại</b> (chi phí cao, ROI thấp), tổng chi phí <b>${m(sum(bad, "co"))}</b>; thấp nhất <b>${esc(bad[0].c.ten)}</b> (ROI ${r2(bad[0].roi)}).`] : ["g", "Không có CTV chi phí cao mà ROI thấp."],
      [sh3 > 35 ? "w" : "", `Top 3 CTV tạo ra <b>${sh3.toFixed(0)}%</b> GMV${sh3 > 35 ? ", phụ thuộc cao, nên mở rộng nhóm CTV chủ lực" : ""}.`]]);
  }
  const by = k => R.filter(r => r.gr == k);
  $("chips").innerHTML = `<span class="chip ${grp == "" ? "on" : ""}" data-g="">Tất cả ${R.length}</span>` + Object.keys(GR).map(k => `<span class="chip ${grp == k ? "on" : ""}" data-g="${k}">${k} ${by(k).length}</span>`).join("");
  $("chips").querySelectorAll(".chip").forEach(c => c.onclick = () => { grp = c.dataset.g; rHS(); });
  const D = R.filter(r => !grp || r.gr == grp).sort((a, b) => b.g - a.g); $("nRank").textContent = D.length + " CTV · sắp theo GMV";
  $("tRank").innerHTML = `<thead><tr><th>#</th><th>CTV</th><th>Kênh</th><th class=num>Booking</th><th class=num>Chi phí</th><th class=num>GMV</th><th class=num>ROI</th><th class=num>Đúng hạn</th><th>Đề xuất</th></tr></thead><tbody>` + (D.length ?
    D.map((r, i) => `<tr><td style="color:#94A3B8">${i + 1}</td><td style="font-weight:500">${esc(r.c.ten)}</td><td style="color:#64748B">${esc(r.c.kenh)}</td><td class=num>${r.n}</td><td class=num>${m(r.co)}</td><td class=num>${m(r.g)}</td><td class=num style="font-weight:600;color:${r.roi < 1 ? "#B91C1C" : r.roi < ROI_T ? "#B45309" : "#0F172A"}">${r2(r.roi)}</td><td class=num>${r.on.toFixed(0)}%</td><td><span class="tag ${GR[r.gr][0]}">${GR[r.gr][2]}</span></td></tr>`).join("") : emptyRow(9)) + "</tbody>";
}

/* ===== 7. Đối soát =====
   So khớp booking (đã nghiệm thu trở đi) với dữ liệu thanh toán của kế toán theo mã booking:
   Lệch số tiền · Chi trùng · Thiếu bên kế toán (booking ghi đã TT nhưng KT không có) · Không có booking (KT chi cho mã không tồn tại / chưa nghiệm thu) */
function recon() {
  const byB = groupBy(tt, x => x.maBooking), all = new Map(bk.map(b => [b.id, b])), L = [];
  bk.filter(b => b.st >= 2 && b.st <= 4).forEach(b => {
    const k = byB.get(b.id) || [], s = sum(k, "soTien");
    if (k.length > 1) L.push({ id: b.id, ten: b.c.ten, bk: b.cost, kt: s, type: "Chi trùng", cls: "t-b", hint: `Kế toán có ${k.length} dòng chi, đề nghị thu hồi khoản trùng` });
    else if (k.length == 1 && s != b.cost) L.push({ id: b.id, ten: b.c.ten, bk: b.cost, kt: s, type: "Lệch số tiền", cls: "t-w", hint: s < b.cost ? "Kế toán ghi thiếu, đề nghị chi bổ sung" : "Kế toán ghi dư, đề nghị thu hồi hoặc trừ kỳ sau" });
    else if (!k.length && b.st == 4) L.push({ id: b.id, ten: b.c.ten, bk: b.cost, kt: null, type: "Thiếu bên kế toán", cls: "t-b", hint: "Booking ghi đã thanh toán nhưng kế toán chưa ghi nhận" });
  });
  byB.forEach((k, id) => { const b = all.get(id); if (!b || b.st < 2) L.push({ id, ten: b ? b.c.ten : "—", bk: b ? b.cost : null, kt: sum(k, "soTien"), type: "Không có booking", cls: "t-b", hint: b ? "Kế toán đã chi nhưng booking chưa nghiệm thu" : "Không tìm thấy mã booking, kiểm tra lại với kế toán" }); });
  return { L };
}
function rDS() {
  const pend = bk.filter(b => b.st == 2 || b.st == 3), p2 = pend.filter(b => b.st == 2), p3 = pend.filter(b => b.st == 3), paid = sel().filter(b => b.st == 4), over = pend.filter(b => TODAY - b.day > WAIT), { L } = recon();
  const net = L.reduce((x, r) => x + (r.kt != null && r.bk != null ? r.kt - r.bk : 0), 0);
  kpis("kDS", [{ l: "Đã nghiệm thu, chưa đề nghị", v: m(sum(p2, "cost")), s: p2.length + " booking" }, { l: "Đã đề nghị, chờ kế toán chi", v: m(sum(p3, "cost")), s: p3.length + " booking" },
    { l: "Đã thanh toán trong kỳ", v: m(sum(paid, "cost")), s: paid.length + " booking" }, { l: "Khoản lệch cần xác nhận", v: L.length, s: L.length ? "chênh lệch ròng " + vnd(net) + "đ" : "không có khoản lệch", meter: L.length ? 100 : 0, mc: "#B45309" }]);
  const AG = [["0–15 ngày", 0, 15], ["16–30 ngày", 16, 30], ["31–45 ngày", 31, 45], ["Trên 45 ngày", 46, 1e9]], inA = (a, g) => a.filter(b => { const x = TODAY - b.day; return x >= g[1] && x <= g[2]; });
  if (!pend.length) { emptyChart("cAge"); ins("iAge", bk.length ? [["g", "Không có khoản nào đang chờ thanh toán."]] : []); }
  else {
    ec("cAge").setOption({ ...ANI, grid: { left: 48, right: 12, top: 30, bottom: 24 }, legend: LEG, tooltip: { ...TIP, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "#0F172A08" } }, valueFormatter: v => m(v) },
      xAxis: { type: "category", data: AG.map(g => g[0]), ...AX, splitLine: { show: false } }, yAxis: { type: "value", ...AX, axisLabel: { ...AX.axisLabel, formatter: trM } },
      series: [{ name: "Chưa đề nghị", type: "bar", stack: "a", barWidth: "42%", data: AG.map(g => sum(inA(p2, g), "cost")), itemStyle: { color: "#CBD5E1" } },
        { name: "Đã đề nghị", type: "bar", stack: "a", data: AG.map((g, i) => ({ value: sum(inA(p3, g), "cost"), itemStyle: { color: g[1] > WAIT ? "#B45309" : "#1D4ED8", borderRadius: [3, 3, 0, 0] } })) }] }, true);
    ins("iAge", [["", `Đang chờ thanh toán <b>${m(sum(pend, "cost"))}</b> cho <b>${pend.length}</b> booking.`],
      over.length ? ["w", `<b>${over.length}</b> booking chờ quá ${WAIT} ngày (<b>${m(sum(over, "cost"))}</b>), nên gửi danh sách nhắc kế toán.`] : ["g", `Không có khoản nào chờ quá ${WAIT} ngày.`],
      ["", `Đã đề nghị nhưng kế toán chưa chi: <b>${m(sum(p3, "cost"))}</b>.`]]);
  }
  $("tLech").innerHTML = `<thead><tr><th>Booking</th><th>CTV</th><th class=num>Theo booking</th><th class=num>Theo kế toán</th><th class=num>Chênh lệch</th><th>Loại</th></tr></thead><tbody>` + (L.length ?
    L.map(x => `<tr><td>${esc(x.id)}</td><td>${esc(x.ten)}</td><td class=num>${x.bk == null ? "—" : vnd(x.bk)}</td><td class=num>${x.kt == null ? "—" : vnd(x.kt)}</td><td class=num style="font-weight:600;color:${x.bk != null && x.kt != null && x.kt < x.bk ? "#B91C1C" : "#0F172A"}">${x.bk == null || x.kt == null ? "—" : (x.kt - x.bk > 0 ? "+" : "") + vnd(x.kt - x.bk)}</td><td><span class="tag ${x.cls}">${x.type}</span></td></tr><tr class="sub"><td colspan="6">→ ${x.hint}</td></tr>`).join("")
    : emptyRow(6, tt.length ? "Không có khoản lệch" : "Chưa có dữ liệu thanh toán của kế toán để đối soát")) + "</tbody>";
  ins("iLech", L.length ? [["w", `<b>${L.length} khoản</b> cần kế toán xác nhận, chênh lệch ròng <b>${vnd(net)}đ</b>.`], ["", "Đề xuất: xuất file đối soát gửi kế toán trước ngày chốt sổ."]] : (tt.length ? [["g", "Số liệu booking và kế toán đã khớp."]] : []));
}

/* ===== 8. CTV & Booking ===== */
let selCtv = null, selSt = null;
const warn = c => { const w = []; if (!c.stk) w.push("Thiếu STK"); if (!c.cccd) w.push("Thiếu CCCD"); if (c.dup) w.push("Trùng SĐT"); return w; };
["q", "fT", "fW"].forEach(i => $(i).oninput = rCB);
function rCB() {
  const B = sel(), P = sel(prev()), cnt = new Map(); B.forEach(b => cnt.set(b.c, (cnt.get(b.c) || 0) + 1));
  const posted = x => x.filter(b => b.posted).length, late = x => x.filter(b => b.late0).length;
  kpis("kCB", [{ l: "CTV đang active", v: ctv.filter(c => c.tt == "Active").length, s: `trên ${ctv.length} CTV` }, { l: "Booking mới", v: B.length, ...chg(B.length, P.length), s: "so với kỳ trước" },
    { l: "Đã đăng bài", v: posted(B), s: B.length ? (posted(B) / B.length * 100).toFixed(0) + "% số booking" : "" }, { l: "Quá deadline chưa đăng", v: late(B), s: late(B) ? "cần nhắc CTV" : "không có", meter: late(B) ? 100 : 0, mc: "#B91C1C" }]);
  const q = $("q").value.toLowerCase(), ft = $("fT").value, fw = $("fW").checked;
  const L = ctv.filter(c => (!S.k || c.kenh == S.k) && (!S.n || c.ns == S.n) && (!q || (c.id + c.ten + c.sdt).toLowerCase().includes(q)) && (!ft || c.tt == ft) && (!fw || warn(c).length)).sort((a, b) => (cnt.get(b) || 0) - (cnt.get(a) || 0));
  $("nCtv").textContent = L.length;
  $("tCtv").innerHTML = `<thead><tr><th>Mã</th><th>Họ tên</th><th>Kênh</th><th class=num>Booking</th><th>Trạng thái</th><th>Cảnh báo</th></tr></thead><tbody>` + (L.length ? L.slice(0, 500).map(c =>
    `<tr class="x ${selCtv === c ? "sel" : ""}" data-i="${ctv.indexOf(c)}"><td style="color:#64748B">${esc(c.id)}</td><td style="font-weight:500">${esc(c.ten)}</td><td>${esc(c.kenh)}</td><td class=num>${cnt.get(c) || 0}</td><td><span class="tag ${c.tt == "Active" ? "t-g" : c.tt == "Tạm dừng" ? "t-w" : "t-b"}">${esc(c.tt)}</span></td><td>${warn(c).map(x => `<span class="tag t-b">${x}</span>`).join(" ")}</td></tr>`).join("")
    : emptyRow(6, ctv.length ? "Không có CTV khớp bộ lọc" : "Chưa có CTV nào")) + "</tbody>";
  $("tCtv").querySelectorAll("tr.x").forEach(t => t.onclick = () => { const c = ctv[t.dataset.i]; selCtv = selCtv === c ? null : c; rCB(); });
  const BS = selCtv ? B.filter(b => b.c === selCtv) : B;
  $("stChips").innerHTML = `<span class="chip ${selSt === null ? "on" : ""}" data-i="">Tất cả ${BS.length}</span>` + ST.map((x, i) => `<span class="chip ${selSt === i ? "on" : ""}" data-i="${i}">${x} ${BS.filter(b => b.st == i).length}</span>`).join("");
  $("stChips").querySelectorAll(".chip").forEach(c => c.onclick = () => { selSt = c.dataset.i === "" ? null : (selSt === +c.dataset.i ? null : +c.dataset.i); rCB(); });
  const BB = BS.filter(b => selSt === null || b.st == selSt), c = selCtv;
  $("bkT").innerHTML = (c ? "Booking của " + esc(c.ten) : "Booking") + ` <small>${BB.length}</small>`;
  $("prof").innerHTML = c ? `<div class="prof"><span>Mã <b>${esc(c.id)}</b></span><span>SĐT <b>${esc(c.sdt)}</b></span><span>Kênh <b>${esc(c.kenh)}</b></span><span>Follower <b>${vnd(c.fl)}</b></span><span>Ngành <b>${esc(c.nganh)}</b></span><span>Rate <b>${vnd(c.rate)}</b></span><span>Phụ trách <b>${esc(c.ns)}</b></span></div>` : "";
  const SC = ["t-m", "t-n", "t-w", "t-w", "t-g", "t-b"];
  $("tBk").innerHTML = `<thead><tr><th>Mã</th>${c ? "" : "<th>CTV</th>"}<th>Chiến dịch</th><th>Ngày book</th><th class=num>Chi phí</th><th class=num>GMV</th><th>Trạng thái</th></tr></thead><tbody>` + (BB.length ?
    BB.slice(0, 300).map(b => `<tr><td style="color:#64748B">${esc(b.id)}</td>${c ? "" : `<td>${esc(b.c.ten)}</td>`}<td>${esc(b.camp)}</td><td>${fmt(b.day)}</td><td class=num>${vnd(b.cost)}</td><td class=num>${vnd(b.gmv)}</td><td><span class="tag ${SC[b.st]}">${ST[b.st]}</span>${b.late0 ? ' <span class="tag t-b">Trễ</span>' : ""}</td></tr>`).join("") : emptyRow(7)) + "</tbody>";
}

/* ===== 9. Xuất file, điều hướng, khởi động ===== */
function rXF() { $("xfNote").innerHTML = `Mọi file sẽ xuất theo bộ lọc đang chọn: <b>${fmt(S.from)}/${dd(S.from).getUTCFullYear()} – ${fmt(S.to)}/${dd(S.to).getUTCFullYear()}</b>${S.k ? " · kênh " + esc(S.k) : ""}${S.n ? " · phụ trách " + esc(S.n) : ""}.`; }
document.querySelectorAll("[data-soon]").forEach(b => b.onclick = () => toast("Chức năng này sẽ làm ở bước sau"));
let tab = "tq";
$("tabs").querySelectorAll("button").forEach(b => b.onclick = () => { tab = b.dataset.s; $("tabs").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  document.querySelectorAll("section").forEach(s => s.classList.toggle("on", s.id == tab)); $("bar").style.display = tab == "cv" ? "none" : ""; render(); });
function render() {
  $("pre").querySelectorAll("span").forEach(e => e.classList.toggle("on", e.dataset.p == S.pre)); $("dF").value = iso(S.from); $("dT").value = iso(S.to); $("fK").value = S.k; $("fN").value = S.n;
  const p = prev(); $("cmp").textContent = `${S.to - S.from + 1} ngày · so với ${fmt(p.from)}–${fmt(p.to)}`;
  ({ tq: rTQ, hs: rHS, ds: rDS, cb: rCB, xf: rXF, cv: () => window.KOC_TASKS && window.KOC_TASKS.render() })[tab]();
}
const U = CFG.nguoiDung || {}; $("who").innerHTML = `<b>${esc(U.ten || "")}</b> · ${esc(U.vaiTro || "")}`;
DEMO = /[?&]demo=1/.test(location.search);
load(DEMO ? window.makeDemoData(TISO) : window.KOC_DATA);
window.KOC_APP = { todos, today: TODAY, iso, fromIso, fmt, esc, toast };
setPre(CFG.mocMacDinh || "30");
})();
