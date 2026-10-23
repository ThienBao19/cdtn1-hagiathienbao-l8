# Luồng chính end-to-end – L8 Khảo sát hài lòng CSAT/NPS (Sprint 2, buổi 10)

Làm theo sáu bước tích hợp của Buổi 10. Luồng chính lấy lại từ đặc tả BT1: UC1 (tạo lời mời) → UC2 (khách trả lời, luồng chính 8 bước) → UC3 (Nhân viên tra cứu) → UC4/UC5 (Quản lý xem chỉ số).

## Bước 1 – Luồng chính viết bằng lời

| # | Ai làm | Việc | Thành phần đi qua | Kết quả mong đợi |
|---|---|---|---|---|
| 1 | Hệ thống quản lý phiếu (mô phỏng bằng curl) | Báo phiếu `BH-000106/2026` đã đóng | API1 → InvitationService → InvitationRepository → `survey_invitation` | `201`, có `token` 64 ký tự, `survey_url`, hạn 7 ngày |
| 2 | Khách hàng | Mở `survey_url` trên điện thoại | M1 → `survey.api.js` → API2 → SurveyService | Thấy mã phiếu, trung tâm, thiết bị, ngày trả máy |
| 3 | Khách hàng | Chọn CSAT 2, NPS 5, bấm Gửi đánh giá | M1 → API3 → SurveyService (BR-L8-01, BR-L8-02, BR-L8-05) → `survey_response` | Lời cảm ơn; mở lại link thấy “Bạn đã gửi đánh giá cho phiếu này” |
| 4 | Nhân viên `nv.q10` | Đăng nhập, mở Danh sách phản hồi, lọc CSAT ≤ 2 | Đăng nhập → M2 → API4 → ResponseService (QT-14, QT-15, BR-L8-04) | Phản hồi vừa gửi đứng đầu, nhãn “Cần chăm sóc”, số điện thoại dạng che |
| 5 | Quản lý trung tâm `ql.q10` | Đăng nhập, mở Dashboard, chọn tháng hiện tại | M3 → hai API báo cáo → ReportService (BR-L8-03) | Chỉ số tháng có mốc so sánh; kỹ thuật viên của phiếu có thêm phản hồi |

## Bước 2 – Chạy riêng từng bước trước khi ghép

| Bước | Cách chạy riêng | Kết quả |
|---|---|---|
| 1 | `curl -X POST /api/survey-invitations` | 201; gọi lần 2 → 409 `INVITATION_EXISTS` |
| 2–3 | `curl /api/surveys/{token}`, `curl -X POST …/responses`; kiểm thử `tests/api.survey.test.js` | 200 / 201 / 409 / 410 / 400 đúng hợp đồng |
| 4 | Đăng nhập bằng curl lấy token, gọi `/api/survey-responses`; kiểm thử `tests/response.service.test.js`, `tests/auth.service.test.js` | 200; khác trung tâm → 403; thiếu token → 401 |
| 5 | Gọi `/api/reports/technicians`, `/api/reports/monthly-trend`; kiểm thử `tests/report.service.test.js` | Số khớp công thức BR-L8-03 tính tay |

## Bước 3 – Ghép tăng dần

1. API1 + API2: token trả về từ API1 mở được bằng API2.
2. + API3 qua giao diện M1 (Vite proxy `/api` → backend).
3. + Đăng nhập + M2: phản hồi gửi ở M1 xuất hiện trên M2.
4. + M3: số phản hồi tháng hiện tại của trung tâm tăng thêm 1.

## Bước 4 – Chỗ đứt gãy đã gặp và cách phân loại

| Triệu chứng | Loại lỗi | Cách sửa |
|---|---|---|
| Sửa khách hàng giữ nguyên số điện thoại lại báo trùng: `customer_id` từ CSDL là chuỗi `"7"`, so với số `7` ra khác (Sprint 1) | HỢP ĐỒNG (kiểu dữ liệu ở ranh giới repository) | Đổi BIGINT về số ở một chỗ duy nhất (`db/pool.js`), không vá thêm `if` ở service |
| Tắt backend, trang M2 chỉ nhận mã 500 không có JSON từ proxy của Vite | HỢP ĐỒNG (frontend chờ `{error:{code,message}}`) | `client.js` quy về `NETWORK_ERROR` kèm thông báo tiếng Việt và nút Thử lại |
| `.env` cũ có `SECRET_KEY` trống thì đăng nhập sẽ lỗi lúc chạy | CẤU HÌNH | `index.js` dừng ngay khi thiếu `SECRET_KEY` và báo cách sửa; `.env.example` có giá trị mẫu |
| Báo cáo tháng không có phản hồi trả 0% (dễ hiểu nhầm là rất tệ) | Ý NGHĨA | Hợp đồng quy định chỉ số `null` khi không có phản hồi; giao diện hiện “—” / “chưa có” (TD-17) |

## Bước 5 – Chạy toàn luồng trên dữ liệu mẫu

Dữ liệu: `npm run db:reset` nạp 6 trung tâm, 24 kỹ thuật viên, 1.206 khách hàng, 2.409 phiếu, 2.230 lời mời, 1.476 phản hồi (01–10/2026; sinh mô phỏng seed 42 theo quy mô case study – TD-16).

| Bước | Đầu vào | Đầu ra quan sát được |
|---|---|---|
| 1 | `{"ticket_code":"BH-000106/2026"}` | `201`, `status: CHO_TRA_LOI`, `survey_url: http://localhost:5173/khao-sat/<token>`, hạn sau 7 ngày |
| 2 | Mở `survey_url` (màn hình 360 px) | Phiếu BH-000106/2026 · Trung tâm bảo hành Quận 10 · Samsung Galaxy S23; không cuộn ngang |
| 3 | Bấm Gửi khi chưa chọn CSAT | “Vui lòng chọn mức hài lòng”, dữ liệu đã nhập được giữ (AC2.4) |
| 3 | CSAT 2, NPS 5, bỏ trống nhận xét (không bắt buộc – FR4) | “Cảm ơn bạn đã đánh giá! Phản hồi cho phiếu BH-000106/2026 đã được ghi nhận. Bộ phận chăm sóc khách hàng sẽ liên hệ lại với bạn.” |
| 4 | `nv.q10`, lọc CSAT ≤ 2 | 16 phản hồi (trước khi gửi là 15); dòng đầu: 14:45 23/10/2026 · BH-000106/2026 · Đặng Minh Thư · Cần chăm sóc · `097****999` · Lê Minh Dũng · 2/5 · 5 |
| 4 | Từ 30/09 đến 01/09 | “Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc” (AC5.3) |
| 4 | Từ 01/12 đến 31/12/2026 | “Không có phản hồi phù hợp – Tổng số = 0” kèm nút Xoá bộ lọc (AC5.2) |
| 4 | `nv.q10` mở /bao-cao | “Bạn không có quyền xem nội dung này” (403) |
| 5 | `ql.q10`, tháng 10/2026 | “Tháng 10/2026: tỉ lệ khách hài lòng 78,3%, tăng 7,6 điểm phần trăm so với tháng 09/2026, cao hơn mức toàn hệ thống (73,1%).” Bảng KTV: Lê Minh Dũng (KTV của phiếu BH-000106) có 1 phản hồi, CSAT TB 2,00, nhãn “Dưới mức trung tâm”, xếp đầu bảng |
| 5 | `ql.q10` mở M2 | Số điện thoại hiện đầy đủ `0977888999` (QT-15) |
| – | Tắt backend, bấm Tìm trên M2 | “Không tải được dữ liệu – Không kết nối được tới hệ thống…” + nút Thử lại; bật lại backend, bấm Thử lại → danh sách hiện lại |

Số liệu ở bảng trên lấy từ lần chạy ngày 23/10/2026 trên máy em (ảnh 05 → 11); giờ tạo lời mời và số liệu tháng hiện tại phụ thuộc thời điểm chạy.

## Bước 6 – Ảnh chụp minh chứng (lưu trong `docs/evidence/`)

| Tệp | Nội dung |
|---|---|
| `05-luong-api1-tao-loi-moi.png` | Bước 1: lệnh tạo lời mời và kết quả 201 có `survey_url` |
| `06-m1-khao-sat.png` | Bước 2–3: trang khảo sát trên khung điện thoại, đã chọn điểm |
| `07-m1-cam-on.png` | Bước 3: lời cảm ơn sau khi gửi |
| `08-m2-danh-sach.png` | Bước 4: M2 lọc CSAT ≤ 2, dòng đầu là phản hồi vừa gửi |
| `09-m3-dashboard.png` | Bước 5: M3 của Quản lý trung tâm |
| `10-m2-rong.png` | Trạng thái rỗng (lọc tháng 12/2026) |
| `11-m2-loi-thu-lai.png` | Trạng thái lỗi khi tắt backend, có nút Thử lại |
