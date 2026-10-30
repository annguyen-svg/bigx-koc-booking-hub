/* ==========================================================
   BIGX · KOC BOOKING HUB · demo-data.js
   Sinh DATA GIẢ để xem thử giao diện (nút "Xem data mẫu").
   Không ảnh hưởng dữ liệu thật. Có thể xoá file này khi
   không cần demo nữa (nhớ xoá dòng nạp file trong index.html).
   ========================================================== */
window.makeDemoData = function (todayIso) {
  let s = 11;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647,
    pick = a => a[Math.floor(r() * a.length)],
    ri = (a, b) => Math.floor(a + r() * (b - a + 1));
  const DAY = 864e5, T = Date.parse(todayIso + "T00:00:00Z"),
    iso = n => new Date(T - n * DAY).toISOString().slice(0, 10); // n ngày trước hôm nay
  const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"],
    dem = ["Thị", "Văn", "Ngọc", "Minh", "Thu", "Hoài", "Gia"],
    ten = ["Anh", "Linh", "Trang", "Hương", "Nam", "Huy", "Mai", "Vy", "Thảo", "Quân", "Hà", "Tú"];
  const KENH = window.KOC_CONFIG.kenh, ST = window.KOC_CONFIG.trangThai,
    NGANH = ["Mỹ phẩm", "Thời trang", "Mẹ & bé", "F&B", "Gia dụng"], NS = ["Linh", "Tuấn", "Hằng"],
    CAMP = ["Sale 11.11", "Serum X", "Mùa hè", "Back to school", "Halloween"];

  const ctv = [], q = {};
  for (let i = 1; i <= 90; i++) {
    const ma = "CTV" + String(i).padStart(5, "0");
    q[ma] = .5 + r() * 1.5;
    ctv.push({ ma, hoTen: pick(ho) + " " + pick(dem) + " " + pick(ten), sdt: "09" + ri(10000000, 99999999),
      kenh: pick(KENH), follower: ri(5, 500) * 1000, nganh: pick(NGANH), rateCard: ri(5, 60) * 100000,
      stk: r() > .12 ? "1234567890" : "", nganHang: "VCB", cccd: r() > .1 ? "0790000000" : "",
      phuTrach: pick(NS), trangThai: r() > .92 ? "Tạm dừng" : r() > .97 ? "Blacklist" : "Active",
      ngayOnboard: iso(ri(0, 300)) });
  }
  ctv[14].sdt = ctv[3].sdt; // cố tình trùng SĐT để demo cảnh báo

  const booking = [], thanhToan = [], ok = ctv.filter(c => c.trangThai !== "Blacklist");
  for (let i = 1; i <= 900; i++) {
    const c = pick(ok), age = Math.floor(Math.pow(r(), 1 / .75) * 180);
    let st; if (r() < .05) st = 5; else if (age > 45) st = 4; else if (age > 20) st = pick([2, 3, 4, 4]);
    else if (age > 7) st = pick([1, 2, 2, 3, 4]); else st = pick([0, 0, 1, 1, 2]);
    const late = r() < .1, posted = st >= 1 && st <= 4,
      view = posted ? Math.round(ri(3, 200) * 1000 * q[c.ma]) : 0,
      gmv = view ? Math.round(c.rateCard * (.3 + Math.pow(r(), 1.6) * 5) * q[c.ma] / 1e3) * 1e3 : 0,
      dl = Math.max(0, age - ri(5, 10));
    const b = { ma: "BK" + String(i).padStart(5, "0"), maCTV: c.ma, chienDich: pick(CAMP), nhanHang: pick(["Brand A", "Brand B", "Brand C"]),
      ngayBook: iso(age), deadline: iso(dl), ngayDang: posted ? iso(late ? Math.max(0, dl - 2) : dl + 1) : "",
      trangThai: ST[st], chiPhi: c.rateCard, view, tuongTac: Math.round(view * (.02 + r() * .08)), click: Math.round(view * .01),
      don: Math.round(gmv / ri(150, 300) / 1e3), gmv };
    if (late && !posted && dl > 2) b.deadline = iso(Math.max(0, age - 3)); // trễ hạn chưa đăng
    booking.push(b);
    if (st === 4) thanhToan.push({ maBooking: b.ma, soTien: b.chiPhi, thueKhauTru: Math.round(b.chiPhi * .1), ngayTT: iso(Math.max(0, age - 30)), soChungTu: "CT" + i });
  }
  // cố tình tạo vài dòng lệch để demo đối soát
  if (thanhToan.length > 10) {
    thanhToan[0].soTien -= 500000;
    thanhToan[3].soTien += 200000;
    thanhToan.push({ ...thanhToan[5], soChungTu: "CT-TRUNG" });
    thanhToan.splice(7, 1);
    thanhToan.push({ maBooking: "BK99999", soTien: 3000000, thueKhauTru: 300000, ngayTT: iso(3), soChungTu: "CT-LA" });
  }
  // ngân sách tháng giả
  const plan = {};
  for (let k = 0; k < 7; k++) {
    const d = new Date(T); d.setUTCMonth(d.getUTCMonth() - k);
    const key = d.toISOString().slice(0, 7); plan[key] = {};
    KENH.forEach(x => plan[key][x] = ri(42, 58) * 1e5 * 30);
  }
  return { ctv, booking, thanhToan, nganSachThang: plan };
};
