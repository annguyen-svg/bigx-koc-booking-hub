# Bigx · KOC Booking Hub

Web quản lý data CTV/KOC booking của team Booking (Bigx): hồ sơ CTV, booking, hiệu suất, đối soát kế toán, xuất file.

- Chạy trên GitHub Pages, không cần server.
- Hiện đang ở trạng thái **web trống**. Bấm "Xem data mẫu" trên thanh trên cùng (hoặc thêm `?demo=1` vào cuối link) để xem thử bằng data giả.

## Cấu trúc file

| File | Dùng để |
|---|---|
| `index.html` | Bố cục các tab, ô KPI, khung biểu đồ |
| `style.css` | Màu sắc, font, kích thước |
| `config.js` | **Thiết lập hay sửa**: tên người dùng, danh sách kênh, trạng thái booking, mục tiêu đúng hạn, ngân sách tháng, mốc thời gian mặc định |
| `data.js` | Nơi chứa dữ liệu (đang trống), có ghi chú cấu trúc cột |
| `demo-data.js` | Sinh data giả để demo |
| `app.js` | Toàn bộ logic: lọc, KPI, biểu đồ, bảng, đối soát |

## Lưu ý bảo mật

Repo đang để **public**. Không đưa dữ liệu thật của CTV (SĐT, STK, CCCD…) vào repo. Dữ liệu thật sẽ chuyển sang database có đăng nhập ở giai đoạn sau.

## Việc tiếp theo (dự kiến)

1. Thêm / sửa CTV và booking ngay trên web
2. Import file Excel
3. Xuất file Excel (đối soát, nhân sự, report, đề nghị thanh toán)
4. Kết nối database + đăng nhập, phân quyền (booking / kế toán / nhân sự)
