# Bigx · KOC Booking Hub

Web quản lý data CTV/KOC booking của team Booking (Bigx). Chạy trên GitHub Pages, không cần server.

- Link web: https://annguyen-svg.github.io/bigx-koc-booking-hub/
- Xem thử bằng data giả: thêm `?demo=1` vào cuối link, hoặc bấm "Xem data mẫu" trên thanh trên cùng.

## Các tab
| Tab | Nội dung |
|---|---|
| Tổng quan | 4 KPI (chi phí, GMV, ROI, đúng hạn), xu hướng, ROI theo kênh, việc cần xử lý, nhận định tự động |
| Hiệu suất CTV | Ma trận chi phí và ROI, xếp hạng CTV kèm đề xuất (tăng booking / duy trì / đàm phán) |
| Đối soát | Tuổi khoản chờ thanh toán, các khoản lệch với kế toán và hướng xử lý |
| CTV & Booking | Danh sách CTV, booking theo trạng thái |
| Công việc của tôi | Việc cá nhân, lịch hạn chót, việc định kỳ, gợi ý từ hệ thống (lưu trên trình duyệt) |
| Xuất file | Các file Excel (sẽ làm ở bước sau) |

## Cấu trúc file
| File | Dùng để |
|---|---|
| `index.html` | Bố cục các tab |
| `style.css` | Giao diện (màu, font, khoảng cách) |
| `config.js` | **Thiết lập hay sửa**: người dùng, kênh, mục tiêu ROI/đúng hạn, ngân sách tháng, nhóm việc, việc định kỳ |
| `data.js` | Nơi chứa dữ liệu (đang trống), có ghi chú cấu trúc cột |
| `demo-data.js` | Sinh data giả để demo |
| `app.js` | Logic các tab số liệu và nhận định tự động |
| `tasks.js` | Logic tab Công việc của tôi |

## Lưu ý bảo mật
Repo đang để **public**. Không đưa dữ liệu thật của CTV (SĐT, STK, CCCD…) vào repo. Dữ liệu thật sẽ chuyển sang database có đăng nhập ở giai đoạn sau.
