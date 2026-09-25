Thu thập phản hồi của khách sau khi phiếu bảo hành được đóng, tổng hợp chỉ số hài lòng theo trung tâm, theo kỹ thuật viên và theo thời gian.
<br>Sinh viên:
Hà Gia Thiên Bảo - 2374802010032 - Track SE<br>
<br>Học phần:
Chuyên đề Tốt nghiệp 1, HK1 2026-2027<br>
<br>Luồng nghiệp vụ:
L8 – Tiếp nhận và phân loại yêu cầu bảo hành<br>
## 1. Mục tiêu
Thu thập và tổng hợp khảo sát hài lòng sau bảo hành: khi phiếu bảo hành chuyển sang trạng thái ĐÃ ĐÓNG, hệ thống tạo một lời mời khảo sát duy nhất cho khách hàng, khách hàng chấm điểm CSAT (1–5), NPS (0–10) và để lại nhận xét, hệ thống lưu phản hồi, gắn chờ phân hồi điểm thấp và tổng hợp các chỉ số hài lòng theo trung tâm, kỹ thuật viên và theo tháng trên dashboard cho quản lý.
## 2. Yêu cầu môi trường
Node.js 20 LTS (hoặc: Python 3.11 / JDK 21)
PostgreSQL 16
Biến môi trường: xem .env.example
## 3. Hướng dẫn chạy
(BT2 yêu cầu ≤ 4 bước)
cp .env.example .env và điền giá trị
npm install
npm run db:migrate
npm run dev → mở http://localhost:3000/health
## 4. Cấu trúc thư mục
Giải thích ngắn mỗi thư mục làm gì.
## 5. Kiểm thử
npm test → hiển thị số test PASS
## 6. Trạng thái hiện tại
 Khởi tạo project, smoke test chạy được (buổi 2)
□ Module tiếp nhận yêu cầu (buổi 8–10)
□ Module phân công kỹ thuật viên (buổi 10–12)
