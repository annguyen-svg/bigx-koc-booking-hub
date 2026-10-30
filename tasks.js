/* ==========================================================
   BIGX · KOC BOOKING HUB · tasks.js
   Tab "Công việc của tôi" (chỉ dành cho người dùng web).
   Dữ liệu lưu trong trình duyệt (localStorage) của máy đang dùng:
   không mất khi tắt máy, nhưng không đồng bộ sang máy khác.
   Việc định kỳ cấu hình trong config.js → viecDinhKy.
   ========================================================== */
(function () {
const CFG = window.KOC_CONFIG, A = window.KOC_APP, $ = id => document.getElementById(id), esc = A.esc, fmt = A.fmt, TODAY = A.today;
const KEY = "bigx_koc_tasks_v1", PR = ["#94A3B8", "#1D4ED8", "#B91C1C"], PRN = ["Thấp", "Trung bình", "Cao"];
const dd = i => new Date(Date.UTC(2020, 0, 1) + i * 864e5);
/* ---- lưu trữ ---- */
let DB = { list: [], rec: {} }, canSave = true;
try { const s = localStorage.getItem(KEY); if (s) DB = Object.assign(DB, JSON.parse(s)); } catch (e) { canSave = false; }
if (!DB.since) { DB.since = TODAY; try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { canSave = false; } };
/* ---- việc định kỳ: sinh từ ngày bắt đầu dùng (tối đa 14 ngày trước) đến 21 ngày tới ---- */
function recurring() {
  const out = [];
  (CFG.viecDinhKy || []).forEach((r, i) => {
    for (let d = Math.max(TODAY - 14, DB.since ?? TODAY); d <= TODAY + 21; d++) {
      const x = dd(d), wd = (x.getUTCDay() + 6) % 7 + 1, last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
      const hit = r.lap == "tuan" ? wd == r.thu : x.getUTCDate() == Math.min(r.ngay, last);
      if (!hit) continue;
      const id = "r" + i + "_" + A.iso(d), done = DB.rec[id];
      out.push({ id, ten: r.ten, han: d, p: r.uuTien ?? 1, nhom: r.nhom || "Khác", xong: !!done, doneAt: done || null, rec: true });
    }
  });
  return out;
}
const all = () => DB.list.concat(recurring());
/* ---- trạng thái giao diện ---- */
let filter = "open", pickDay = null, calM = (() => { const x = dd(TODAY); return { y: x.getUTCFullYear(), m: x.getUTCMonth() }; })();
const weekStart = TODAY - ((dd(TODAY).getUTCDay() + 6) % 7), weekEnd = weekStart + 6;
$("tG").innerHTML = (CFG.nhomViec || ["Khác"]).map(x => `<option>${esc(x)}</option>`).join("");
$("tD").value = A.iso(TODAY);
function add(ten, han, p, nhom) {
  ten = (ten || "").trim(); if (!ten) { A.toast("Nhập tên việc trước khi thêm"); return false; }
  DB.list.push({ id: "t" + Date.now() + Math.random().toString(36).slice(2, 6), ten, han, p, nhom, xong: false, doneAt: null }); save(); return true;
}
$("tAdd").onclick = () => { if (add($("tN").value, A.fromIso($("tD").value) ?? TODAY, +$("tP").value, $("tG").value)) { $("tN").value = ""; A.toast("Đã thêm việc"); render(); } };
$("tN").onkeydown = e => { if (e.key == "Enter") $("tAdd").click(); };
$("mPrev").onclick = () => { calM.m--; if (calM.m < 0) { calM.m = 11; calM.y--; } rCal(); };
$("mNext").onclick = () => { calM.m++; if (calM.m > 11) { calM.m = 0; calM.y++; } rCal(); };
function toggle(id) {
  const t = all().find(x => x.id == id); if (!t) return;
  if (t.rec) { if (DB.rec[id]) delete DB.rec[id]; else DB.rec[id] = TODAY; }
  else { const o = DB.list.find(x => x.id == id); o.xong = !o.xong; o.doneAt = o.xong ? TODAY : null; }
  save(); render();
}
function del(id) { DB.list = DB.list.filter(x => x.id != id); save(); A.toast("Đã xoá việc"); render(); }
/* ---- vẽ ---- */
function rCal() {
  const first = Date.UTC(calM.y, calM.m, 1), d0 = Math.round((first - Date.UTC(2020, 0, 1)) / 864e5), off = (new Date(first).getUTCDay() + 6) % 7, days = new Date(Date.UTC(calM.y, calM.m + 1, 0)).getUTCDate();
  $("mT").textContent = `Tháng ${calM.m + 1}/${calM.y}`;
  const open = all().filter(t => !t.xong), mark = new Map(); open.forEach(t => mark.set(t.han, (mark.get(t.han) || "") + (t.han < TODAY ? "o" : "n")));
  let h = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(x => `<div class="h">${x}</div>`).join("");
  for (let i = 0; i < 42; i++) { const d = d0 - off + i, x = dd(d), inM = x.getUTCMonth() == calM.m; if (i >= 35 && !inM && i % 7 == 0) break;
    const mk = mark.get(d); h += `<div class="d ${inM ? "" : "o"} ${d == TODAY ? "t" : ""} ${pickDay == d ? "s" : ""}" data-d="${d}">${x.getUTCDate()}${mk ? `<i class="${mk.includes("o") ? "od" : ""}"></i>` : ""}</div>`; }
  $("cal").innerHTML = h; $("cal").querySelectorAll(".d").forEach(e => e.onclick = () => { const d = +e.dataset.d; pickDay = pickDay === d ? null : d; render(); });
}
function render() {
  const T = all(), open = T.filter(t => !t.xong), od = open.filter(t => t.han < TODAY), td = open.filter(t => t.han == TODAY), wk = open.filter(t => t.han > TODAY && t.han <= TODAY + 7);
  const doneW = T.filter(t => t.xong && t.doneAt >= weekStart && t.doneAt <= weekEnd), dueW = T.filter(t => !t.xong && t.han >= weekStart && t.han <= weekEnd), rate = doneW.length + dueW.length ? doneW.length / (doneW.length + dueW.length) * 100 : 0;
  $("kCV").innerHTML = [["Việc hôm nay", td.length, td.filter(t => t.p == 2).length + " việc ưu tiên cao"], ["Quá hạn", od.length, od.length ? "cần xử lý ngay" : "không có", od.length ? "#B91C1C" : null],
    ["7 ngày tới", wk.length, "chưa tính hôm nay"], ["Hoàn thành tuần này", Math.round(rate) + "%", `${doneW.length} xong · ${dueW.length} còn lại`, rate >= 70 ? "#047857" : "#B45309", rate]]
    .map(k => `<div class="kpi"><div class="l">${k[0]}</div><div class="v" ${k[3] && k[4] == null ? `style="color:${k[3]}"` : ""}>${k[1]}</div><div class="d"><span>${k[2]}</span></div>${k[4] != null ? `<div class="meter"><i style="width:${k[4]}%;background:${k[3]}"></i></div>` : ""}</div>`).join("");
  const CH = [["today", "Hôm nay", td.length], ["week", "7 ngày tới", wk.length], ["over", "Quá hạn", od.length], ["open", "Chưa xong", open.length], ["done", "Đã xong", T.filter(t => t.xong).length]];
  $("cvChips").innerHTML = (pickDay != null ? `<span class="chip on" id="pdC">Ngày ${fmt(pickDay)} ✕</span>` : "") + CH.map(c => `<span class="chip ${pickDay == null && filter == c[0] ? "on" : ""}" data-f="${c[0]}">${c[1]} ${c[2]}</span>`).join("");
  $("cvChips").querySelectorAll("[data-f]").forEach(e => e.onclick = () => { filter = e.dataset.f; pickDay = null; render(); }); if ($("pdC")) $("pdC").onclick = () => { pickDay = null; render(); };
  const F = { today: t => !t.xong && t.han == TODAY, week: t => !t.xong && t.han > TODAY && t.han <= TODAY + 7, over: t => !t.xong && t.han < TODAY, open: t => !t.xong, done: t => t.xong };
  const L = T.filter(pickDay != null ? (t => t.han == pickDay) : F[filter]).sort((a, b) => a.xong - b.xong || (filter == "done" ? b.doneAt - a.doneAt : a.han - b.han) || b.p - a.p);
  $("cvSub").textContent = canSave ? "Tự lưu trên trình duyệt này" : "Trình duyệt không cho lưu, việc sẽ mất khi tải lại trang";
  $("tList").innerHTML = L.length ? L.slice(0, 200).map(t => { const dc = t.xong ? "" : t.han < TODAY ? "od" : t.han == TODAY ? "td" : "", dl = t.han == TODAY ? "Hôm nay" : t.han == TODAY + 1 ? "Ngày mai" : fmt(t.han) + (t.han < TODAY && !t.xong ? ` · trễ ${TODAY - t.han} ngày` : "");
    return `<div class="task ${t.xong ? "done" : ""}"><input type="checkbox" data-id="${t.id}" ${t.xong ? "checked" : ""}><span class="pr" title="Ưu tiên ${PRN[t.p]}" style="background:${PR[t.p]}"></span><span class="nm">${esc(t.ten)} ${t.rec ? '<span class="rec">↻ định kỳ</span>' : ""}</span><span class="tag t-m">${esc(t.nhom)}</span><span class="due ${dc}">${dl}</span>${t.rec ? '<span style="width:22px"></span>' : `<button class="del" data-del="${t.id}" title="Xoá">✕</button>`}</div>`; }).join("")
    : `<div class="empty">${filter == "over" && pickDay == null ? "Không có việc quá hạn" : "Không có việc nào"}</div>`;
  $("tList").querySelectorAll("input[data-id]").forEach(e => e.onchange = () => toggle(e.dataset.id)); $("tList").querySelectorAll("[data-del]").forEach(e => e.onclick = () => del(e.dataset.del));
  const hi = open.filter(t => t.p == 2 && t.han <= TODAY + 7), I = [];
  if (od.length) I.push(["b", `Bạn có <b>${od.length} việc quá hạn</b>${od[0] ? `, lâu nhất: <b>${esc(od.sort((a, b) => a.han - b.han)[0].ten)}</b> (trễ ${TODAY - od[0].han} ngày)` : ""}.`]); else I.push(["g", "Không có việc quá hạn."]);
  if (hi.length) I.push(["w", `<b>${hi.length} việc ưu tiên cao</b> trong 7 ngày tới, nên làm trước.`]);
  I.push([rate >= 70 ? "g" : "", `Tuần này đã xong <b>${doneW.length}</b> việc, tiến độ <b>${Math.round(rate)}%</b>.`]);
  $("iCV").innerHTML = `<div class="t">Nhận định tự động</div>` + I.map(x => `<p class="${x[0]}">${x[1]}</p>`).join("");
  rCal();
  const S = A.todos(), has = n => open.some(t => t.ten == n);
  $("sug").innerHTML = S.length ? S.map((x, i) => { const n = `${x.act} (${x.t.toLowerCase()}: ${x.n})`; return `<div class="sug"><span class="sev" style="background:${x.sev}"></span><span class="txt">${esc(n)}</span>${has(n) ? '<span class="note">Đã thêm</span>' : `<button class="btn" data-s="${i}">+</button>`}</div>`; }).join("")
    : `<div class="empty">Chưa có gợi ý. Khi có dữ liệu booking, hệ thống sẽ gợi ý việc cần làm.</div>`;
  $("sug").querySelectorAll("[data-s]").forEach(b => b.onclick = () => { const x = S[b.dataset.s]; add(`${x.act} (${x.t.toLowerCase()}: ${x.n})`, TODAY + 2, x.sev == "#B91C1C" ? 2 : 1, x.nhom); A.toast("Đã thêm vào danh sách việc"); render(); });
}
window.KOC_TASKS = { render };
})();
