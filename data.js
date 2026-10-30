/* ==========================================================
   BIGX · KOC BOOKING HUB · data.js
   Nơi chứa dữ liệu. Hiện đang TRỐNG.

   CẢNH BÁO: repo này đang để public. KHÔNG điền dữ liệu thật
   của CTV (SĐT, STK, CCCD...) vào file này. Dữ liệu thật sẽ
   chuyển sang database có đăng nhập ở giai đoạn sau.

   Cấu trúc từng bản ghi (để sau này nhập đúng cột):
   ctv:      { ma, hoTen, sdt, email, kenh, linkKenh, follower, nganh, rateCard,
               stk, nganHang, cccd, phuTrach, trangThai, ngayOnboard }
               trangThai: "Active" | "Tạm dừng" | "Blacklist"
   booking:  { ma, maCTV, chienDich, nhanHang, ngayBook, deadline, ngayDang,
               trangThai, chiPhi, view, tuongTac, click, don, gmv }
               trangThai: xem KOC_CONFIG.trangThai
   thanhToan (dữ liệu kế toán): { maBooking, soTien, thueKhauTru, ngayTT, soChungTu }
   Ngày tháng ghi dạng "YYYY-MM-DD", tiền là số nguyên VND.
   ========================================================== */
window.KOC_DATA = {
  ctv: [],
  booking: [],
  thanhToan: []
};
