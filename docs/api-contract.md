# API contract – Khảo sát hài lòng CSAT / NPS (Luồng L8)

Base URL (local): `http://localhost:3000` · Định dạng: JSON, UTF-8 · Thời gian: ISO 8601, múi giờ +07:00.

Lỗi trả về theo một khuôn chung:

```json
{ "error": { "code": "INVITATION_EXPIRED", "message": "Link khảo sát đã hết hạn" } }
```

## 1. Danh sách endpoint

| Mã | Phương thức | Đường dẫn | Mục đích | Truy vết |
|---|---|---|---|---|
| API1 | POST | `/api/survey-invitations` | Tạo lời mời khảo sát khi phiếu bảo hành chuyển sang Đã đóng (gọi từ hệ thống quản lý phiếu bảo hành). | US1 · FR1 · UC1 |
| API2 | GET | `/api/surveys/{token}` | Khách mở link khảo sát: lấy thông tin phiếu để hiển thị trang khảo sát. | US2 · FR2 · UC2 |
| API3 | POST | `/api/surveys/{token}/responses` | Khách gửi phản hồi khảo sát: điểm CSAT, điểm NPS, nhận xét. | US2, US3, US4 · FR2–FR4 · UC2 |
| API4 | GET | `/api/survey-responses` | Nhân viên tra cứu danh sách phản hồi theo trung tâm, khoảng ngày, điểm CSAT tối đa. | US5 · FR5 · UC3 |
| (SHOULD) | GET | `/api/reports/technicians?center_id=2&month=2026-09` | CSAT trung bình và NPS theo kỹ thuật viên | US6 · FR6 · UC5 |
| (SHOULD) | GET | `/api/reports/monthly-trend?center_id=2&from=2026-01&to=2026-09` | Tỉ lệ CSAT và NPS theo tháng của trung tâm | US7 · FR7 · UC6 |

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
  "device_name": "iPhone 13 128GB",
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

## 4. Tự kiểm

Mọi endpoint đều truy vết được về User Story trong bảng truy vết mục 6 của SRS: API1 → US1, API2 → US2, API3 → US2/US3/US4, API4 → US5.
