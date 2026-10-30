# API contract – Khảo sát hài lòng CSAT / NPS (Luồng L8)

Base URL (local): `http://localhost:3000` · Định dạng: JSON, UTF-8 · Thời gian: ISO 8601, múi giờ +07:00. Các trường `status`, `expires_at`, `is_flagged` trong response là giá trị tính khi đọc, không lưu trong CSDL.

Lỗi trả về theo một khuôn chung:

```json
{ "error": { "code": "INVITATION_EXPIRED", "message": "Link khảo sát đã hết hạn" } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Vui lòng chọn mức hài lòng", "field": "csat_score" } }
```

Bổ sung ở BT2 (TD-05): lỗi dữ liệu vào có thêm `field` (tên trường sai); lỗi `ALREADY_RESPONDED` có thêm `details` (điểm đã chấm, AC2.2); body không phải JSON → `400 INVALID_JSON`; CSDL không kết nối được → `503 DB_UNAVAILABLE`; lỗi không lường trước → `500 INTERNAL_ERROR` (không trả lỗi thô của thư viện). Từ buổi 11 (TD-20): mọi phản hồi có header `X-Request-Id`; thông điệp lỗi 500/503 kèm “Mã tra cứu: <requestId>” để đối chiếu với log.

## 1. Danh sách endpoint

| Mã | Phương thức | Đường dẫn | Mục đích | Truy vết |
|---|---|---|---|---|
| API1 | POST | `/api/survey-invitations` | Tạo lời mời khảo sát khi phiếu bảo hành chuyển sang Đã đóng (gọi từ hệ thống quản lý phiếu bảo hành). | US1 · FR1 · UC1 |
| API2 | GET | `/api/surveys/{token}` | Khách mở link khảo sát: lấy thông tin phiếu để hiển thị trang khảo sát. | US2 · FR2 · UC2 |
| API3 | POST | `/api/surveys/{token}/responses` | Khách gửi phản hồi khảo sát: điểm CSAT, điểm NPS, nhận xét. | US2, US3, US4 · FR2–FR4 · UC2 |
| API4 | GET | `/api/survey-responses` | Nhân viên tra cứu danh sách phản hồi theo trung tâm, khoảng ngày, điểm CSAT tối đa. | US5 · FR5 · UC3 |
| (SHOULD) | GET | `/api/reports/technicians?center_id=2&month=2026-09` | CSAT trung bình và NPS theo kỹ thuật viên | US6 · FR6 · UC4 |
| (SHOULD) | GET | `/api/reports/monthly-trend?center_id=2&from=2026-01&to=2026-09` | Tỉ lệ CSAT và NPS theo tháng của trung tâm | US7 · FR7 · UC5 |

## 2. Chi tiết endpoint cho story MUST

### API1 – POST `/api/survey-invitations`

Tạo lời mời khảo sát khi phiếu bảo hành chuyển sang Đã đóng (gọi từ hệ thống quản lý phiếu bảo hành). Truy vết: US1 · FR1 · UC1.

Request:

```json
{
  "ticket_code": "BH-000123/2026"
}
```

Response:

```json
201 Created
{
  "invitation_id": 5012,
  "ticket_code": "BH-000123/2026",
  "token": "9f2c7a1e4b8d...(64 ký tự)",
  "status": "CHO_TRA_LOI",
  "expires_at": "2026-10-09T09:30:00+07:00",
  "survey_url": "http://localhost:5173/khao-sat/9f2c7a1e4b8d..."
}
```

| Mã HTTP | Ý nghĩa |
|---|---|
| 201 | Tạo lời mời thành công |
| 400 | Thiếu ticket_code hoặc sai định dạng BH-xxxxxx/yyyy |
| 404 | Không tìm thấy phiếu bảo hành |
| 409 | Phiếu chưa ở trạng thái Đã đóng (TICKET_NOT_CLOSED) hoặc đã có lời mời (INVITATION_EXISTS) |

### API2 – GET `/api/surveys/{token}`

Khách mở link khảo sát: lấy thông tin phiếu để hiển thị trang khảo sát. Truy vết: US2 · FR2 · UC2.

Request:

```json
GET /api/surveys/9f2c7a1e4b8d...
```

Response:

```json
200 OK
{
  "ticket_code": "BH-000123/2026",
  "center_name": "Trung tâm bảo hành Quận 10",
  "device_model": "iPhone 13 128GB",
  "closed_at": "2026-10-02T09:30:00+07:00",
  "status": "CHO_TRA_LOI",
  "expires_at": "2026-10-09T09:30:00+07:00"
}
```

| Mã HTTP | Ý nghĩa |
|---|---|
| 200 | Lời mời hợp lệ, còn hạn |
| 404 | Mã lời mời không tồn tại |
| 409 | Lời mời đã được trả lời (ALREADY_RESPONDED) |
| 410 | Lời mời đã hết hạn (INVITATION_EXPIRED) |

### API3 – POST `/api/surveys/{token}/responses`

Khách gửi phản hồi khảo sát: điểm CSAT, điểm NPS, nhận xét. Truy vết: US2, US3, US4 · FR2–FR4 · UC2.

Request:

```json
{
  "csat_score": 4,
  "nps_score": 9,
  "comment": "Sửa nhanh, nhân viên tư vấn kỹ."
}
```

Response:

```json
201 Created
{
  "response_id": 2601,
  "ticket_code": "BH-000123/2026",
  "csat_score": 4,
  "nps_score": 9,
  "is_flagged": false,
  "responded_at": "2026-10-02T14:05:12+07:00"
}
```

| Mã HTTP | Ý nghĩa |
|---|---|
| 201 | Lưu phản hồi thành công |
| 400 | Thiếu csat_score hoặc giá trị ngoài miền (CSAT 1–5, NPS 0–10, nhận xét > 500 ký tự) |
| 404 | Mã lời mời không tồn tại |
| 409 | Lời mời đã được trả lời (ALREADY_RESPONDED) |
| 410 | Lời mời đã hết hạn (INVITATION_EXPIRED) |

### API4 – GET `/api/survey-responses`

Nhân viên tra cứu danh sách phản hồi theo trung tâm, khoảng ngày, điểm CSAT tối đa. Truy vết: US5 · FR5 · UC3.

Request:

```json
GET /api/survey-responses?center_id=2&from=2026-09-01&to=2026-09-30&csat_max=2&page=1&page_size=20
Header: Authorization: Bearer <JWT vai trò NHAN_VIEN>
```

Response:

```json
200 OK
{
  "total": 7,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "response_id": 2588,
      "ticket_code": "BH-000098/2026",
      "center_name": "Trung tâm bảo hành Quận 10",
      "customer_name": "Nguyễn Văn Hùng",
      "phone": "090****567",
      "technician_name": "Lê Minh Dũng",
      "csat_score": 2,
      "nps_score": 4,
      "comment": "Hẹn trả máy trễ 3 ngày.",
      "is_flagged": true,
      "responded_at": "2026-09-28T10:12:00+07:00"
    }
  ]
}
```

| Mã HTTP | Ý nghĩa |
|---|---|
| 200 | Thành công (kể cả khi total = 0) |
| 400 | from > to, sai định dạng ngày, csat_max ngoài 1–5, page_size ngoài 1–100 |
| 401 | Chưa đăng nhập |
| 403 | Vai trò không được xem trung tâm này (QT-14) |

## 3. Quy tắc validation từng trường

| Trường | Vị trí | Bắt buộc | Kiểu | Ràng buộc |
|---|---|---|---|---|
| `ticket_code` | API1 body | Bắt buộc | Chuỗi | Đúng mẫu BH-\d{6}/\d{4}, ví dụ BH-000123/2026 |
| `token` | API2, API3 path | Bắt buộc | Chuỗi hex | Đúng 64 ký tự [0-9a-f] |
| `csat_score` | API3 body | Bắt buộc | Số nguyên | 1 ≤ giá trị ≤ 5 |
| `nps_score` | API3 body | Không bắt buộc | Số nguyên / null | 0 ≤ giá trị ≤ 10 |
| `comment` | API3 body | Không bắt buộc | Chuỗi | Tối đa 500 ký tự, cắt khoảng trắng đầu/cuối |
| `center_id` | API4 query | Không bắt buộc | Số nguyên | > 0 và thuộc phạm vi xem của người dùng (QT-14) |
| `from, to` | API4 query | Không bắt buộc | Ngày YYYY-MM-DD | from ≤ to; khoảng cách ≤ 366 ngày |
| `csat_max` | API4 query | Không bắt buộc | Số nguyên | 1 ≤ giá trị ≤ 5 |
| `page, page_size` | API4 query | Không bắt buộc | Số nguyên | page ≥ 1 (mặc định 1); 1 ≤ page_size ≤ 100 (mặc định 20) |

## 4. Endpoint CRUD bổ sung ở BT2 (TD-01, TD-02)

| Phương thức | Đường dẫn | Mục đích | Mã HTTP |
|---|---|---|---|
| GET | `/api/customers?include_inactive=true` | Danh sách khách hàng (mặc định chỉ đang hoạt động), số điện thoại dạng che (QT-15) | 200 |
| GET | `/api/customers/{id}` | Xem một khách hàng | 200 / 400 / 404 |
| POST | `/api/customers` | Tạo khách hàng `{full_name, phone}` | 201 / 400 / 409 PHONE_EXISTS |
| PUT | `/api/customers/{id}` | Sửa khách hàng | 200 / 400 / 404 / 409 PHONE_EXISTS, CUSTOMER_INACTIVE |
| DELETE | `/api/customers/{id}` | Ngừng sử dụng (`is_active = false`, QT-13 – không xoá vật lý) | 200 / 404 |
| GET | `/api/technicians?center_id=1&include_inactive=true` | Danh sách kỹ thuật viên, lọc theo trung tâm | 200 / 400 |
| GET | `/api/technicians/{id}` | Xem một kỹ thuật viên | 200 / 400 / 404 |
| POST | `/api/technicians` | Tạo kỹ thuật viên `{center_id, full_name, level}` | 201 / 400 (VALIDATION_ERROR, CENTER_NOT_FOUND) |
| PUT | `/api/technicians/{id}` | Sửa kỹ thuật viên | 200 / 400 / 404 / 409 TECHNICIAN_INACTIVE |
| DELETE | `/api/technicians/{id}` | Ngừng làm việc (`is_active = false`, QT-13) | 200 / 404 |

Ràng buộc: `phone` đúng 10 chữ số, bắt đầu bằng 0 và duy nhất; `level` ∈ {SO_CAP, TRUNG_CAP, CAO_CAP}; `full_name` bắt buộc, ≤ 120 ký tự.

## 5. Bổ sung ở Sprint 2 (buổi 9–10): đăng nhập, API4 đã hiện thực, báo cáo (TD-14, TD-17)

### POST `/api/auth/login`

Request `{ "username": "nv.q10", "password": "..." }` → `200 { "token": "<JWT>", "user": { "username", "full_name", "role": "NHAN_VIEN" | "QUAN_LY", "center_id", "center_name" } }`.
Sai tên hoặc mật khẩu, hoặc tài khoản đã ngừng → `401 INVALID_CREDENTIALS` (cùng một thông báo). Thiếu trường → `400 VALIDATION_ERROR` kèm `field`.
Các endpoint dưới đây cần header `Authorization: Bearer <token>`; thiếu/sai/hết hạn token → `401 UNAUTHORIZED`, frontend xoá phiên và về trang đăng nhập.

### API4 – GET `/api/survey-responses` (đã hiện thực)

Đúng như mục 2. Bổ sung: `center_id` có thể bỏ trống (mặc định trung tâm của người đăng nhập); khác trung tâm của người đăng nhập → `403 FORBIDDEN` (QT-14). `phone` dạng che với `NHAN_VIEN`, đầy đủ với `QUAN_LY` (QT-15). `to` tính trọn ngày đó theo giờ Việt Nam. `responded_at` trả dạng ISO 8601 UTC.

### GET `/api/reports/technicians?month=YYYY-MM` (US6 · FR6 · UC4 – chỉ `QUAN_LY`)

`month` mặc định là tháng hiện tại. Response:

```json
{ "center_id": 1, "month": "2026-09", "previous_month": "2026-08",
  "center": { "current": { "responses": 41, "csat_avg": 3.95, "csat_rate": 70.7, "nps": 16, "nps_responses": 35 }, "previous": { ... } },
  "technicians": [ { "technician_id": 101, "technician_name": "...", "level": "SO_CAP", "current": { ... }, "previous": { ... } } ] }
```

(Số liệu trong ví dụ chỉ để minh hoạ.) `technicians` sắp CSAT trung bình tăng dần (thấp nhất lên đầu); chỉ gồm KTV có phản hồi ở tháng này hoặc tháng trước. Chỉ số `null` nghĩa là không có phản hồi (không phải 0).

### GET `/api/reports/monthly-trend?from=YYYY-MM&to=YYYY-MM` (US7 · FR7 · UC5 – chỉ `QUAN_LY`)

Mặc định `to` = tháng hiện tại, `from` = tháng 01 cùng năm; tối đa 24 tháng. Response `{ "center_id", "from", "to", "months": [ { "month": "2026-09", "center": { ...chỉ số... }, "system": { ...chỉ số toàn hệ thống, làm mốc so sánh... } } ] }` – đủ mọi tháng trong khoảng, tháng không có phản hồi có chỉ số `null`.

Công thức (BR-L8-03): `csat_avg` = trung bình CSAT (2 chữ số); `csat_rate` = % phản hồi CSAT 4–5 (1 chữ số); `nps` = % NPS 9–10 trừ % NPS 0–6 trên số phản hồi CÓ chấm NPS, làm tròn số nguyên. Nhân viên gọi → `403 FORBIDDEN`; tháng sai định dạng → `400` kèm `field`.

## 6. Tự kiểm

Mọi endpoint đều truy vết được về User Story trong bảng truy vết mục 6 của SRS: API1 → US1, API2 → US2, API3 → US2/US3/US4, API4 → US5.
