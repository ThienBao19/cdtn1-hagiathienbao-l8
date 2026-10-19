> File này được đọc lại khi chấm BT2 và BT3 (tiêu chí 3: Nhất quán & Tích lũy)

# Nhật ký thay đổi thiết kế

## Sau phản hồi Bài tập 1 (buổi 8, ngày 19/10/2026)

Mỗi điểm ghi đủ bốn dòng: phản hồi – quyết định – lý do – ảnh hưởng. TD-01 đến TD-09 là sai lệch so với thiết kế BT1 phát hiện khi hiện thực Sprint 1 (đề BT2 yêu cầu ghi lại mọi sai lệch). TD-10 đến TD-13 là các điểm giảng viên góp ý cho BT1 (điểm BT1: 9/10 – Đầy đủ 8.0 · Kỹ thuật 9.5 · Nhất quán 9.75 · Trình bày 8.0). Khi nhận phản hồi BT2 sẽ nối tiếp vào cuối file.

### TD-01 Bổ sung CRUD cho hai thực thể customer và technician
- Phản hồi của GV : Không có – tự phát hiện khi đối chiếu đề BT2: API contract BT1 chỉ có API1–API4, không thực thể nào đủ bốn thao tác tạo – đọc – sửa – xoá (yêu cầu S1).
- Quyết định : SỬA
- Lý do : survey_response không được sửa hoặc xoá (BR-L8-05) và survey_invitation chỉ tạo một lần cho mỗi phiếu (QT-10), nên hai bảng cốt lõi của L8 không thể là thực thể CRUD. customer và technician đã có trong ERD BT1 và là dữ liệu đầu vào của US5 (tên, số điện thoại khách) và US6 (chỉ số theo kỹ thuật viên).
- Ảnh hưởng : Thêm 10 endpoint /api/customers và /api/technicians (mục 4 của docs/api-contract.md); thêm CustomerController, TechnicianController, CustomerService, TechnicianService, CustomerRepository, TechnicianRepository. ERD và DDL không đổi.

### TD-02 Giữ nguyên QT-13: thao tác xoá không xoá vật lý
- Phản hồi của GV : Không có – câu hỏi tự đặt ra khi làm CRUD: thao tác “xoá” của S1 có mâu thuẫn với QT-13 (không xoá vật lý hồ sơ khách hàng) không?
- Quyết định : GIỮ NGUYÊN
- Lý do : ticket tham chiếu customer và technician bằng khoá ngoại; xoá vật lý sẽ hoặc bị CSDL chặn, hoặc làm mất dữ liệu cần cho báo cáo CSAT/NPS theo kỹ thuật viên (FR6). Cột is_active đã có sẵn trong ERD BT1 cho đúng mục đích này.
- Ảnh hưởng : DELETE /api/customers/{id} và /api/technicians/{id} đặt is_active = false; GET mặc định chỉ trả bản ghi đang hoạt động, thêm ?include_inactive=true để xem tất cả; không sửa được bản ghi đã ngừng (CUSTOMER_INACTIVE, TECHNICIAN_INACTIVE). Đã ghi chú vào QT-13 trong mục 5 của SRS.

### TD-03 Chuyển db/schema.sql thành migrations/001_init_schema.sql
- Phản hồi của GV : Không có – chạy DDL BT1 lần thứ hai báo lỗi relation "service_center" already exists (lỗi thường gặp nêu ở Buổi 8), không đạt C5 và S3.
- Quyết định : SỬA
- Lý do : Đề BT2 yêu cầu migration dựng được CSDL từ trạng thái trống và chạy lại lần hai không lỗi, không nhân đôi dữ liệu.
- Ảnh hưởng : Nội dung 6 bảng giữ đúng DDL BT1, chỉ thêm IF NOT EXISTS; thêm script npm run migrate (tự tạo CSDL nếu chưa có, ghi file đã chạy vào bảng kỹ thuật schema_migrations – không thuộc ERD nghiệp vụ), npm run seed (seeds/001_sample_data.sql, khoá cố định + ON CONFLICT DO NOTHING) và npm run db:reset. Xoá db/schema.sql để chỉ còn một nguồn DDL; cập nhật đường dẫn trong SRS và README.

### TD-04 Thống nhất tên trường device_model trong API2
- Phản hồi của GV : Không có – tự phát hiện: response mẫu của API2 trong api-contract.md ghi device_name, còn ERD và DDL ghi device_model.
- Quyết định : SỬA
- Lý do : Tiêu chí 3 yêu cầu thuật ngữ trong mã khớp với thiết kế; cột trong CSDL là nguồn gốc nên sửa tài liệu API theo ERD, không đổi CSDL.
- Ảnh hưởng : Sửa response mẫu API2 trong docs/api-contract.md; SurveyService trả trường device_model.

### TD-05 Bổ sung field, details và mã 503 vào khuôn lỗi JSON
- Phản hồi của GV : Không có – đối chiếu đề BT2: “thiếu trường bắt buộc thì trả mã 400 kèm tên trường thiếu”; bước chấm 5 tắt một thành phần phụ trợ; AC2.2 cần hiển thị lại điểm đã chấm.
- Quyết định : SỬA
- Lý do : Khuôn lỗi BT1 {"error":{"code","message"}} chưa cho biết trường nào sai, và chưa định nghĩa phản ứng khi CSDL tắt (dễ treo hoặc trả lỗi thô của thư viện pg).
- Ảnh hưởng : Khuôn lỗi giữ nguyên code, message, thêm field (lỗi dữ liệu vào) và details (ALREADY_RESPONDED trả lại điểm đã chấm); thêm 400 INVALID_JSON, 503 DB_UNAVAILABLE (kết nối hết hạn sau 3 giây), 500 INTERNAL_ERROR. Ánh xạ mã lỗi → HTTP chỉ nằm ở middlewares/error-handler.js. Cập nhật mục 1 của docs/api-contract.md.

### TD-06 Làm rõ ranh giới hết hạn của BR-L8-01
- Phản hồi của GV : Không có – khi viết kiểm thử giá trị biên thấy BR-L8-01 (“hết hạn sau 7 ngày”) chưa nói đúng thời điểm tròn 7 ngày thì còn hạn hay không.
- Quyết định : SỬA
- Lý do : Quy tắc mơ hồ ở ranh giới thì kiểm thử biên không có kết quả đúng để so; chọn cách hiểu “expires_at = created_at + 7 ngày, tại expires_at vẫn còn hiệu lực” để khớp trường expires_at đã công bố trong API1/API2.
- Ảnh hưởng : Bổ sung một câu vào BR-L8-01 trong mục 5 của SRS; kiểm thử biên trong tests/survey.service.test.js (tròn 7 ngày còn nhận, trễ 1 ms trả INVITATION_EXPIRED).

### TD-07 Giữ nguyên QT-15, tạm che số điện thoại với mọi người gọi ở Sprint 1
- Phản hồi của GV : Không có – Sprint 1 chưa có đăng nhập nên chưa biết người gọi có phải Quản lý trung tâm (vai trò duy nhất được xem số đầy đủ) hay không.
- Quyết định : GIỮ NGUYÊN
- Lý do : Che nhầm cả với Quản lý trung tâm an toàn hơn lộ số điện thoại khi chưa xác thực; quy tắc QT-15 và NFR4 không đổi, chỉ hoãn phần ngoại lệ.
- Ảnh hưởng : API /api/customers trả phone dạng 090****567 cho mọi lời gọi; ngoại lệ cho Quản lý trung tâm làm cùng JWT ở buổi 9 (README mục 6).

### TD-08 Thêm biến môi trường FRONTEND_URL và INVITATION_VALID_DAYS
- Phản hồi của GV : Không có – khi hiện thực API1 cần địa chỉ trang khảo sát để tạo survey_url; .env.example BT1 chưa có biến này.
- Quyết định : SỬA
- Lý do : Đề BT2 yêu cầu .env.example liệt kê đủ mọi biến và mọi cấu hình đưa ra biến môi trường, không ghi cứng trong mã.
- Ảnh hưởng : Thêm hai biến vào .env.example (mặc định http://localhost:5173 và 7 ngày) và src/backend/config/env.js. Giá trị 7 ngày của BR-L8-01 không đổi.

### TD-09 Tách validators/ và middlewares/ khỏi Controller trong lớp trình bày
- Phản hồi của GV : Không có – sơ đồ kiến trúc BT1 ghi Controller vừa kiểm định dạng đầu vào vừa đổi lỗi nghiệp vụ thành mã HTTP.
- Quyết định : SỬA
- Lý do : Theo Buổi 7 (kiểm ba tầng: validator – service – ràng buộc CSDL) và cấu trúc tối thiểu của đề BT2 (routes/ services/ repositories/ validators/). Hai thư mục mới vẫn thuộc lớp trình bày nên không đổi số lớp và chiều phụ thuộc.
- Ảnh hưởng : src/backend có routes/, controllers/, validators/, middlewares/ (lớp trình bày), services/ (nghiệp vụ), repositories/ (truy cập dữ liệu). Sẽ vẽ trong docs/architecture-thuc-te.drawio trước khi nộp BT2.

### TD-10 Nộp một file PDF duy nhất, đúng tên
- Phản hồi của GV : Em nộp file .docx; đề yêu cầu một file PDF duy nhất BT1_<MSSV>_<HoTen>.pdf.
- Quyết định : SỬA
- Lý do : Sai định dạng hoặc tên file là lỗi hình thức bị trừ điểm ở tiêu chí 1; mục 3.1 đề BT2 nhắc lại đúng yêu cầu này.
- Ảnh hưởng : BT2 nộp duy nhất BT2_2374802010032_HaGiaThienBao.pdf (xuất từ Word, mở lại kiểm tra trước khi nộp). Không ảnh hưởng thiết kế hệ thống.

### TD-11 Bổ sung dòng cam kết vào bảng khai báo AI
- Phản hồi của GV : Phụ lục A thiếu dòng cam kết “Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm...” kèm họ tên, MSSV, ngày.
- Quyết định : SỬA
- Lý do : Chính sách liêm chính AI của học phần yêu cầu sinh viên hiểu và chịu trách nhiệm mọi phần nộp, kể cả phần có AI hỗ trợ; dòng cam kết là phần bắt buộc của phụ lục.
- Ảnh hưởng : Thêm dòng cam kết kèm họ tên, MSSV, ngày vào cuối docs/ai-disclosure.md; phụ lục khai báo AI của báo cáo BT2 có cùng dòng cam kết.

### TD-12 Rút gọn báo cáo, để API contract trong repo
- Phản hồi của GV : Bài dài 31 trang trong khi gợi ý 6–9 trang. API contract nên để trong repo (docs/api-contract.md) thay vì đưa toàn bộ vào PDF.
- Quyết định : SỬA
- Lý do : Đề BT2 gợi ý 6–9 trang; tài liệu chi tiết nằm trong repo được cập nhật cùng mã nguồn, PDF chỉ tóm tắt và dẫn link nên không bị lệch phiên bản.
- Ảnh hưởng : Báo cáo BT2 theo đúng khung 7 mục + phụ lục của đề, mỗi mục giữ độ dài gợi ý; API, SRS, nhật ký thay đổi chỉ dẫn link tới docs/ trong repo tại tag v0.2. docs/api-contract.md là nguồn duy nhất của hợp đồng API.

### TD-13 Viết kiểm thử API3 cho AC2.1–AC2.4 trước giao diện M1
- Phản hồi của GV : Gợi ý cho BT2: bắt đầu từ API3 và các AC2.1–AC2.4, viết test cho gửi trùng (409), hết hạn (410) trước khi hoàn thiện giao diện M1.
- Quyết định : SỬA (làm theo góp ý)
- Lý do : API3 tập trung ba quy tắc BR-L8-01, BR-L8-02, BR-L8-05; khoá đúng hành vi bằng kiểm thử trước thì M1 chỉ cần hiển thị theo mã lỗi đã cố định.
- Ảnh hưởng : Thêm tests/api.survey.test.js: 7 kiểm thử HTTP cho AC2.1, AC2.2 (409 ở API2 và API3), AC2.3 (410, kèm biên tròn 7 ngày), AC2.4 (400), token không tồn tại (404). Tổng 35 kiểm thử PASS. M1 làm ở buổi 10 dựa trên các mã 201/400/404/409/410 này.
