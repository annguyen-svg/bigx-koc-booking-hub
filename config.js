/* ==========================================================
   BIGX · KOC BOOKING HUB · config.js
   Các thiết lập hay phải sửa đều nằm ở file này.
   ========================================================== */
window.KOC_CONFIG = {
  // Người đang dùng (hiện ở góc phải trên cùng)
  nguoiDung: { ten: "Anna", vaiTro: "Leader Booking" },

  // Danh sách kênh và màu tương ứng trên biểu đồ
  kenh: ["TikTok", "Facebook", "Instagram", "YouTube"],
  mauKenh: ["#5D5FEF", "#0095FF", "#FA5A7D", "#FF947A"],

  // Vòng đời trạng thái booking (đúng thứ tự, không đổi vị trí)
  trangThai: ["Đã book", "Đã đăng", "Đã nghiệm thu", "Đã đề nghị TT", "Đã thanh toán", "Huỷ"],

  // Mục tiêu tỷ lệ đăng đúng hạn (%)
  mucTieuDungHan: 90,

  // Ngân sách booking theo tháng và theo kênh (đơn vị VND).
  // Ví dụ: "2026-11": { TikTok: 150000000, Facebook: 80000000 }
  nganSachThang: {},

  // Mốc thời gian mặc định khi mở web: "7" | "14" | "30" | "m" (tháng này) | "all"
  mocMacDinh: "30"
};
