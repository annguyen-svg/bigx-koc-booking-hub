/* ==========================================================
   BIGX · KOC BOOKING HUB · config.js
   Các thiết lập hay phải sửa đều nằm ở file này.
   ========================================================== */
window.KOC_CONFIG = {
  // Người dùng (hiện ở góc phải trên cùng)
  nguoiDung: { ten: "Anna", vaiTro: "Leader Booking" },

  // Danh sách kênh
  kenh: ["TikTok", "Facebook", "Instagram", "YouTube"],

  // Vòng đời trạng thái booking (đúng thứ tự, không đổi vị trí)
  trangThai: ["Đã book", "Đã đăng", "Đã nghiệm thu", "Đã đề nghị TT", "Đã thanh toán", "Huỷ"],

  // Mục tiêu
  mucTieuROI: 2.0,        // ROI (GMV / chi phí)
  mucTieuDungHan: 90,     // % booking đăng đúng hạn
  nguongChoThanhToan: 30, // số ngày chờ thanh toán thì cảnh báo

  // Ngân sách booking theo tháng và theo kênh (VND).
  // Ví dụ: "2026-11": { TikTok: 150000000, Facebook: 80000000 }
  nganSachThang: {},

  // Mốc thời gian mặc định: "7" | "14" | "30" | "m" (tháng này) | "all"
  mocMacDinh: "30",

  // ---- Tab "Công việc của tôi" ----
  nhomViec: ["Booking", "Kế toán", "Nhân sự", "Báo cáo", "Khác"],
  // Việc định kỳ tự hiện ra. lap: "tuan" (thu: 1=Thứ 2 … 7=Chủ nhật) hoặc "thang" (ngay: 1–31)
  viecDinhKy: [
    { ten: "Gửi báo cáo tuần cho BOD", lap: "tuan", thu: 1, nhom: "Báo cáo", uuTien: 2 },
    { ten: "Cập nhật hồ sơ CTV mới", lap: "tuan", thu: 5, nhom: "Booking", uuTien: 1 },
    { ten: "Chốt đối soát với kế toán", lap: "thang", ngay: 25, nhom: "Kế toán", uuTien: 2 }
  ]
};
