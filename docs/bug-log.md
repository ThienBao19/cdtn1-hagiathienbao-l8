# Bug Log – L8 Khảo sát hài lòng CSAT/NPS

Mỗi lỗi ghi đủ 7 dòng theo mẫu Buổi 11, gỡ theo bốn bước: tái lập → khoanh vùng → sửa nguyên nhân → xác nhận. Các lỗi dưới đây được phát hiện và sửa trong lúc phát triển, TRƯỚC khi commit lần đầu tính năng tương ứng, nên link commit là commit đầu tiên chứa bản sửa (không có commit “fix” riêng).

## BUG-001 · Major – Sửa khách hàng giữ nguyên số điện thoại bị báo trùng

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-001 · Major – không sửa được tên của bất kỳ khách hàng nào nếu giữ nguyên số điện thoại |
| 2. Phát hiện bởi | Gọi thử CRUD bằng curl ở Sprint 1 (bước “Gọi thử 2 endpoint” của Buổi 8) |
| 3. Triệu chứng | `PUT /api/customers/6` với đúng số điện thoại hiện tại của khách 6 trả `409 PHONE_EXISTS` |
| 4. Cách tái lập | `curl -X PUT localhost:3000/api/customers/6 -H "Content-Type: application/json" -d '{"full_name":"Đặng Minh Thư","phone":"0977888999"}'` → 409 (5/5 lần) |
| 5. Nguyên nhân | Thư viện `pg` trả cột BIGINT (`customer_id`) dạng CHUỖI `"6"`; `ensurePhoneFree` so `owner.customer_id !== exceptId` với `exceptId` là SỐ `6` nên luôn khác → coi số điện thoại như thuộc khách khác. Lỗi hợp đồng kiểu dữ liệu ở ranh giới repository |
| 6. Cách sửa | Đổi BIGINT về số ở MỘT chỗ duy nhất: `types.setTypeParser(20, …)` trong `src/backend/db/pool.js` (ranh giới CSDL), không vá `if`/`String()` ở service. Khoá BIGSERIAL của hệ thống nhỏ hơn 2^53 nên đổi an toàn |
| 7. Commit và xác nhận | [59cfc15](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/59cfc15bfaa9a27a4d6649b7276b34c0dfcc892b) · chạy lại lệnh ở dòng 4 → `200`; test hồi quy `tests/db-pool.test.js` (2 test) PASS |

## BUG-002 · Major – Kiểm thử qua HTTP lỗi “mime.getType is not a function”

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-002 · Major – `npm test` FAIL ở mọi test dùng Supertest, chặn mục C4 |
| 2. Phát hiện bởi | Chạy `npm test` sau khi thêm `tests/api.validation.test.js` (Sprint 1) |
| 3. Triệu chứng | 4/5 test API báo `TypeError: mime.getType is not a function`; test service vẫn PASS |
| 4. Cách tái lập | `cd src/backend && npx jest tests/api` với cấu hình Jest có `"moduleDirectories": ["node_modules", "<rootDir>/src/backend/node_modules"]` |
| 5. Nguyên nhân | `tests/` nằm ngoài `src/backend` nên phải chỉ cho Jest nơi tìm thư viện; `moduleDirectories` làm Jest tìm `mime` ở thư mục gốc `node_modules` TRƯỚC thư mục lồng của `superagent`, nạp nhầm `mime@1` (của express) thay vì `mime@2` mà superagent cần. Lỗi cấu hình môi trường |
| 6. Cách sửa | Đổi sang `"modulePaths": ["<rootDir>/src/backend/node_modules"]` trong `src/backend/package.json` – chỉ dùng làm đường tìm DỰ PHÒNG, giữ nguyên thứ tự tìm lồng của Node |
| 7. Commit và xác nhận | [2588013](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/25880130e3eeddfeae3fd04ba57bcd0fd64047c4) · `npm test` → toàn bộ PASS, kể cả từ thư mục clone mới (phép thử thư mục trống) |

## BUG-003 · Major – Tắt backend thì giao diện không biết báo gì

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-003 · Major – vi phạm yêu cầu trạng thái “lỗi kết nối có nút thử lại” (S4) |
| 2. Phát hiện bởi | Chạy luồng chính Sprint 2, bước tắt backend (Buổi 10: “Xong khi: tắt backend → thấy thông báo lỗi có nút thử lại”) |
| 3. Triệu chứng | Tắt backend rồi bấm Tìm trên M2: nhận mã 500 KHÔNG có thân JSON, giao diện không có mã lỗi để hiển thị thông báo phù hợp |
| 4. Cách tái lập | `npm run dev` ở frontend, dừng backend (Ctrl+C), mở /phan-hoi, bấm Tìm; tab Network: `GET /api/survey-responses` → 500, body rỗng |
| 5. Nguyên nhân | Khi backend tắt, proxy của Vite (TD-15) tự trả 500 không theo hợp đồng lỗi `{"error":{"code","message"}}`; `client.js` chỉ đọc `data.error` nên không có gì để rẽ nhánh. Lỗi hợp đồng ở ranh giới frontend–API |
| 6. Cách sửa | Ở ranh giới duy nhất `src/frontend/src/api/client.js`: phản hồi lỗi không có JSON hoặc `fetch` thất bại đều quy về `ApiError{status:0, code:"NETWORK_ERROR"}` kèm câu tiếng Việt; `DataState` hiện nút Thử lại khi `retryable` |
| 7. Commit và xác nhận | [bfc0bfc](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/bfc0bfc49431a62e1ae93733158c8e62247744c9) · làm lại dòng 4 → “Không tải được dữ liệu… Thử lại”, bật backend bấm Thử lại → dữ liệu hiện lại (ảnh `docs/evidence/11-m2-loi-thu-lai.png`) |

## BUG-004 · Major – Đăng nhập lỗi lúc chạy khi .env thiếu SECRET_KEY

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-004 · Major – Nhân viên, Quản lý không đăng nhập được (chặn M2, M3) |
| 2. Phát hiện bởi | Rà soát cấu hình trước Sprint 2: `.env` trên máy em (tạo từ `.env.example` Sprint 1) có `SECRET_KEY=` trống |
| 3. Triệu chứng | Backend vẫn khởi động bình thường; chỉ tới lúc bấm Đăng nhập mới lỗi `secretOrPrivateKey must have a value` → 500 |
| 4. Cách tái lập | Đặt `SECRET_KEY=` trong `.env`, `npm start`, `POST /api/auth/login` với tài khoản đúng → 500 |
| 5. Nguyên nhân | Cấu hình bắt buộc không được kiểm khi khởi động; `.env.example` cũ để trống `SECRET_KEY`. Lỗi cấu hình môi trường (nguồn khác biệt số 3 giữa hai máy – Buổi 11) |
| 6. Cách sửa | `src/backend/index.js` dừng NGAY khi thiếu hoặc `SECRET_KEY` ngắn hơn 16 ký tự, in hướng dẫn sửa; `.env.example` có giá trị mẫu; README mục 3 bước 1 nhắc đặt `SECRET_KEY` |
| 7. Commit và xác nhận | [bda2405](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/bda24050b50c7004dbf58a6c0d6a67abac14c8e8) · `SECRET_KEY=` → `npm start` dừng với thông báo “Thiếu SECRET_KEY…”; đặt lại giá trị → đăng nhập `nv.q10` thành công |

## BUG-005 · Minor – `npm run db:reset` lỗi trên máy chưa có CSDL

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-005 · Minor – lệnh phụ `db:reset` không chạy được trên máy mới; cách dựng chính (`migrate` + `seed`) không bị ảnh hưởng |
| 2. Phát hiện bởi | Phép thử thư mục trống trước khi nộp BT2 (Buổi 12, việc 6): chạy `db:reset` ngay sau khi clone |
| 3. Triệu chứng | `Lỗi reset: database "smartcrm" does not exist` |
| 4. Cách tái lập | `psql -U postgres -c "DROP DATABASE smartcrm"` rồi `cd src/backend && npm run db:reset` (5/5 lần) |
| 5. Nguyên nhân | `db-reset.js` kết nối thẳng vào CSDL `smartcrm` để xoá bảng TRƯỚC khi gọi `migrate()` – mà bước tạo CSDL nằm bên trong `migrate()`. Thứ tự khởi tạo sai, chỉ lộ ra trên máy chưa từng chạy `migrate` |
| 6. Cách sửa | Xuất `ensureDatabase()` từ `scripts/migrate.js` và gọi nó ở dòng đầu `reset()`; không bọc `try/catch` để nuốt lỗi |
| 7. Commit và xác nhận | Commit `fix(db): db:reset tu tao CSDL khi may moi chua co` (link: điền sau khi push) · xoá CSDL rồi chạy `npm run db:reset` hai lần liên tiếp → cả hai lần đủ 7 bảng, số dòng không đổi |
