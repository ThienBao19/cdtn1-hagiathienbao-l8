# Bug Log – L8 Khảo sát hài lòng CSAT/NPS

Mỗi lỗi ghi đủ 7 dòng theo mẫu Buổi 11/13, gỡ theo bốn bước: tái lập → khoanh vùng → sửa nguyên nhân → xác nhận. Phân loại theo hai câu hỏi của Buổi 13: (1) hệ thống không dùng được, dữ liệu sai hoặc lộ dữ liệu → Critical; (2) chức năng quan trọng sai nhưng có cách làm khác → Major; còn lại Minor.

- **BUG-001 → BUG-004** (Sprint 1–2) được phát hiện và sửa TRƯỚC khi commit lần đầu tính năng tương ứng, nên link là commit đầu tiên chứa bản sửa – không có commit `fix` riêng.
- **BUG-005 → BUG-008** mỗi bug một commit `fix(...)` riêng, chỉ chứa đúng các tệp sửa bug đó. BUG-006 → BUG-008 do Test Report buổi 14 phát hiện (TC-11, TC-07, TC-06).

| Bug | Mức | Phát hiện bởi | Commit sửa |
|---|---|---|---|
| BUG-006 | **Critical** | TC-11 | [b469d40](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/b469d40d21d551403f9993b1e6e9bf8847f2711f) |
| BUG-007 | Minor | TC-07 | [128ca01](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/128ca01ca4f98f2ba82490b610cadb748ec4cd16) |
| BUG-008 | Minor | TC-06 | [ff3b3f0](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/ff3b3f0c3a96f6103b2a1a68d1f9c7795bf2fb4b) |
| BUG-005 | Minor | Phép thử thư mục trống BT2 | [04a70d2](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/04a70d2aa59bf60d1b372be5acc9256e73409e05) |
| BUG-001 → 004 | Major | Sprint 1–2 | commit tính năng (xem từng mục) |

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
| 7. Commit và xác nhận | [04a70d2](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/04a70d2aa59bf60d1b372be5acc9256e73409e05) – `fix(db): db:reset tu tao CSDL khi may moi chua co` · xoá CSDL rồi chạy `npm run db:reset` hai lần liên tiếp → cả hai lần đủ 7 bảng, số dòng không đổi |

## BUG-006 · Critical – Không đăng nhập vẫn ngừng được khách hàng và tạo lời mời khảo sát

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-006 · **Critical** – lỗ hổng bảo mật (OWASP A01 Broken Access Control) làm SAI dữ liệu: bất kỳ ai gọi được API đều ngừng sử dụng khách hàng, sửa kỹ thuật viên và tạo lời mời; lời mời trả kèm `token` nên người ngoài tự gửi được phản hồi giả, làm lệch CSAT/NPS của trung tâm |
| 2. Phát hiện bởi | TC-11 (Test Report) – lần chạy 1 FAIL: `[200, 200, 201]` thay vì `[401, 401, 401]` |
| 3. Triệu chứng | Không gửi header `Authorization`: `GET /api/customers` → 200 danh sách 1.206 khách; `DELETE /api/customers/6` → 200, `is_active: false`; `POST /api/survey-invitations` → 201 kèm `token` và `survey_url` |
| 4. Cách tái lập | `npm start`, rồi `curl -s -X DELETE localhost:3000/api/customers/6` → `HTTP 200` (5/5 lần) – ảnh `docs/screenshots/BUG-006-tai-lap.png` |
| 5. Nguyên nhân | `routes/index.js` chỉ gắn middleware `requireAuth` cho các route Sprint 2 (API4, báo cáo); CRUD và API1 viết ở Sprint 1 khi chưa có đăng nhập (TD-14) và không được rà lại khi thêm đăng nhập. Ngoài ra khi thiếu `authService` thì route nội bộ mặc định MỞ (fail open). Lỗi phân quyền ở tầng trình bày |
| 6. Cách sửa | `routes/index.js`: mọi route nội bộ (CRUD `customers`, `technicians`, API1) đi qua cùng middleware `auth`; thiếu `authService` thì dùng `denyAll` trả 401 (fail closed). Chỉ API2, API3 (khách mở link có mã 64 ký tự) và đăng nhập là công khai. Cập nhật `tests/api.validation.test.js` gửi kèm token (cùng commit). Tài liệu (`docs/api-contract.md` mục 6, README mục 5, `docs/luong-chinh.md`) cập nhật ở commit tài liệu buổi 14 |
| 7. Commit và xác nhận | [b469d40](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/b469d40d21d551403f9993b1e6e9bf8847f2711f) – `fix(auth): bat buoc dang nhap cho CRUD va API1 (BUG-006)` · chạy lại TC-11 → PASS; `npm test` 77/77 PASS (`BUG-006-fixed.png`); trên backend thật: không token → `401 UNAUTHORIZED`, khách #6 vẫn `is_active = t`; có token `nv.q10` → 201 (`BUG-006-xac-nhan.png`) |

## BUG-007 · Minor – Nhận xét 500 ký tự có emoji bị báo vượt 500 ký tự

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-007 · Minor – khách dùng emoji bị từ chối sớm hơn giới hạn 500 ký tự và thấy số đếm sai (“hiện có 870”); vẫn gửi được nếu bớt chữ, dữ liệu đã lưu không sai |
| 2. Phát hiện bởi | TC-07 (Test Report) – lần chạy 1 FAIL |
| 3. Triệu chứng | Nhận xét đúng 500 ký tự (130 chữ + 370 emoji 👍) → `400 VALIDATION_ERROR` “Nhận xét tối đa 500 ký tự (hiện có 870)”; bộ đếm trên M1 cũng hiện 870/500 |
| 4. Cách tái lập | `npx jest -t "TC-07 "` hoặc gửi `POST /api/surveys/{token}/responses` với `comment` = 370 lần “👍” + 130 chữ → 400 (5/5 lần) |
| 5. Nguyên nhân | `validateResponseInput` (và bộ đếm của `SurveyPage.jsx`) dùng `String.length` – đếm đơn vị UTF-16; emoji ngoài BMP chiếm 2 đơn vị. CSDL `VARCHAR(500)` đếm theo ký tự (đã thử: 500 emoji lưu được, 501 emoji bị PostgreSQL từ chối). Lỗi hợp đồng: hai tầng đếm “ký tự” theo hai cách khác nhau |
| 6. Cách sửa | Đếm theo code point `[...text].length` ở cả `services/survey.service.js` và `src/frontend/src/pages/SurveyPage.jsx` (hàm `charLength`), khớp cách đếm của CSDL |
| 7. Commit và xác nhận | [128ca01](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/128ca01ca4f98f2ba82490b610cadb748ec4cd16) – `fix(survey): dem do dai nhan xet theo ky tu (BUG-007)` · chạy lại TC-07 → PASS (500 lưu được, 501 → “hiện có 501”); `npm test` sau commit: TC-07 hết FAIL, còn TC-06, TC-11 thuộc bug khác (`BUG-007-fixed.png`) |

## BUG-008 · Minor – NPS âm đúng nửa đơn vị bị làm tròn lệch

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-008 · Minor – chỉ số hiển thị lệch 1 điểm trong trường hợp đúng nửa đơn vị và NPS âm; nghiệp vụ, dữ liệu lưu vẫn đúng |
| 2. Phát hiện bởi | TC-06 (Test Report) – lần chạy 1 FAIL: `[13, -12]` |
| 3. Triệu chứng | 8 phản hồi, 3 promoter / 2 detractor → NPS 13; 2 promoter / 3 detractor → NPS −12 (cùng độ lớn 12,5 nhưng hai kết quả không đối xứng) |
| 4. Cách tái lập | `node -e "console.log(Math.round(12.5), Math.round(-12.5))"` → `13 -12`; hoặc `npx jest -t "TC-06 "` |
| 5. Nguyên nhân | `computeMetrics` dùng `Math.round`, hàm làm tròn nửa đơn vị về phía +∞, không phải “làm tròn số nguyên” thông thường (ra xa số 0) như hợp đồng mô tả |
| 6. Cách sửa | `services/report.service.js`: hàm `roundHalfAwayFromZero(x) = Math.sign(x) * Math.round(Math.abs(x))`, cộng `0` để không trả `-0`; ghi rõ quy tắc làm tròn trong `docs/api-contract.md` mục 5 |
| 7. Commit và xác nhận | [ff3b3f0](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/ff3b3f0c3a96f6103b2a1a68d1f9c7795bf2fb4b) – `fix(report): lam tron NPS doi xung (BUG-008)` · chạy lại TC-06 → `[13, -13]` PASS; `npm test` sau commit: chỉ còn TC-11 (BUG-006) FAIL (`BUG-008-fixed.png`) |
