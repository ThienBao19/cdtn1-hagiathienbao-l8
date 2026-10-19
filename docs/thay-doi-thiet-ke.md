> File này được đọc lại khi chấm BT2 và BT3 (tiêu chí 3: Nhất quán & Tích lũy)

# Nhật ký thay đổi thiết kế

## Sau phản hồi Bài tập 1 (buổi 8, ngày 19/10/2026)

Mỗi điểm ghi đủ bốn dòng: phản hồi – quyết định – lý do – ảnh hưởng. Các điểm TD-01 đến TD-09 là sai lệch so với thiết kế BT1 phát hiện khi hiện thực Sprint 1 (đề BT2 yêu cầu ghi lại mọi sai lệch); góp ý của giảng viên ghi tiếp từ TD-10. Khi nhận phản hồi BT2 sẽ nối tiếp vào cuối file.

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

### TD-10 (điền theo phản hồi của giảng viên cho BT1)
- Phản hồi của GV : [ghi nguyên văn điểm GV góp ý]
- Quyết định : [SỬA hoặc GIỮ NGUYÊN]
- Lý do : [lý do kỹ thuật cụ thể, gắn với phạm vi L8]
- Ảnh hưởng : [phần nào của SRS / ERD / API / mã nguồn thay đổi]
