-- =====================================================================
-- Seed 001 – dữ liệu mẫu nhỏ cho luồng L8 (khớp migrations/001)
-- Chạy lại nhiều lần KHÔNG nhân đôi dữ liệu: mọi dòng có khoá cố định
-- và dùng ON CONFLICT DO NOTHING (tiêu chí C5).
-- Tên trung tâm theo case study Mekong Mobile: 3 TP.HCM, 2 Cần Thơ, 1 Hà Nội.
-- =====================================================================

INSERT INTO service_center (center_id, center_code, center_name, city) VALUES
  (1, 'TT-Q10', 'Trung tâm bảo hành Quận 10',        'TP. Hồ Chí Minh'),
  (2, 'TT-TB',  'Trung tâm bảo hành Quận Tân Bình',  'TP. Hồ Chí Minh'),
  (3, 'TT-TD',  'Trung tâm bảo hành Thủ Đức',        'TP. Hồ Chí Minh'),
  (4, 'TT-NK',  'Trung tâm bảo hành Ninh Kiều',      'Cần Thơ'),
  (5, 'TT-CR',  'Trung tâm bảo hành Cái Răng',       'Cần Thơ'),
  (6, 'TT-CG',  'Trung tâm bảo hành Cầu Giấy',       'Hà Nội')
ON CONFLICT DO NOTHING;

INSERT INTO technician (technician_id, center_id, full_name, level, is_active) VALUES
  (1, 1, 'Lê Minh Dũng',     'CAO_CAP',   TRUE),
  (2, 1, 'Phạm Quốc Huy',    'TRUNG_CAP', TRUE),
  (3, 2, 'Trần Thị Mai',     'TRUNG_CAP', TRUE),
  (4, 2, 'Võ Thanh Tùng',    'SO_CAP',    TRUE),
  (5, 4, 'Nguyễn Văn Dũng',  'CAO_CAP',   TRUE),
  (6, 6, 'Đỗ Hoàng Nam',     'TRUNG_CAP', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO customer (customer_id, full_name, phone) VALUES
  (1, 'Nguyễn Văn Hùng',   '0901234567'),
  (2, 'Trần Thị Lan',      '0912345678'),
  (3, 'Lê Hoàng Phúc',     '0987654321'),
  (4, 'Phạm Ngọc Anh',     '0933111222'),
  (5, 'Huỳnh Gia Bảo',     '0944555666'),
  (6, 'Đặng Minh Thư',     '0977888999')
ON CONFLICT DO NOTHING;

-- Phiếu bảo hành mô phỏng dữ liệu của L2/L4.
-- BH-000101..105: đã đóng, đã có lời mời · BH-000106, BH-000107: đã đóng, CHƯA có lời mời (thử API1)
-- BH-000108: Hoàn tất (chưa đóng) · BH-000109: Đang xử lý  -> API1 phải từ chối (QT-10)
INSERT INTO ticket (ticket_id, ticket_code, center_id, technician_id, customer_id, device_model, status, received_at, closed_at) VALUES
  (1, 'BH-000101/2026', 1, 1, 1, 'iPhone 13 128GB',      'DA_DONG',    now() - interval '10 days', now() - interval '2 days'),
  (2, 'BH-000102/2026', 1, 2, 2, 'Samsung Galaxy A54',   'DA_DONG',    now() - interval '20 days', now() - interval '9 days'),
  (3, 'BH-000103/2026', 2, 3, 3, 'Xiaomi Redmi Note 12', 'DA_DONG',    now() - interval '15 days', now() - interval '5 days'),
  (4, 'BH-000104/2026', 2, 4, 4, 'OPPO Reno10',          'DA_DONG',    now() - interval '12 days', now() - interval '4 days'),
  (5, 'BH-000105/2026', 4, 5, 5, 'iPhone 14 Pro',        'DA_DONG',    now() - interval '6 days',  now() - interval '1 day'),
  (6, 'BH-000106/2026', 1, 1, 6, 'Samsung Galaxy S23',   'DA_DONG',    now() - interval '5 days',  now() - interval '1 hour'),
  (7, 'BH-000107/2026', 6, 6, 1, 'vivo Y36',             'DA_DONG',    now() - interval '4 days',  now() - interval '3 hours'),
  (8, 'BH-000108/2026', 2, 3, 2, 'iPad Gen 9',           'HOAN_TAT',   now() - interval '3 days',  NULL),
  (9, 'BH-000109/2026', 4, 5, 3, 'Realme C55',           'DANG_XU_LY', now() - interval '1 day',   NULL)
ON CONFLICT DO NOTHING;

-- Lời mời khảo sát. Token cố định để thử API2/API3 (ghi trong README):
--   aaaa…(64 ký tự a) : BH-000101 – còn hạn, chờ trả lời
--   bbbb…             : BH-000102 – tạo 8 ngày trước -> hết hạn (BR-L8-01)
--   cccc…             : BH-000103 – đã trả lời, CSAT 2 -> nhãn "Cần chăm sóc"
--   dddd…             : BH-000104 – đã trả lời, CSAT 5
--   eeee…             : BH-000105 – còn hạn, chờ trả lời
INSERT INTO survey_invitation (invitation_id, ticket_id, token, created_at) VALUES
  (1, 1, repeat('a', 64), now() - interval '2 days'),
  (2, 2, repeat('b', 64), now() - interval '8 days'),
  (3, 3, repeat('c', 64), now() - interval '5 days'),
  (4, 4, repeat('d', 64), now() - interval '4 days'),
  (5, 5, repeat('e', 64), now() - interval '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO survey_response (response_id, invitation_id, csat_score, nps_score, comment, responded_at) VALUES
  (1, 3, 2, 4,  'Hẹn trả máy trễ 3 ngày.',           now() - interval '4 days'),
  (2, 4, 5, 10, 'Sửa nhanh, nhân viên tư vấn kỹ.',   now() - interval '3 days')
ON CONFLICT DO NOTHING;

-- Đẩy sequence lên sau các khoá cố định để bản ghi tạo qua API không bị trùng khoá.
SELECT setval(pg_get_serial_sequence('service_center',    'center_id'),     (SELECT MAX(center_id)     FROM service_center));
SELECT setval(pg_get_serial_sequence('technician',        'technician_id'), (SELECT MAX(technician_id) FROM technician));
SELECT setval(pg_get_serial_sequence('customer',          'customer_id'),   (SELECT MAX(customer_id)   FROM customer));
SELECT setval(pg_get_serial_sequence('ticket',            'ticket_id'),     (SELECT MAX(ticket_id)     FROM ticket));
SELECT setval(pg_get_serial_sequence('survey_invitation', 'invitation_id'), (SELECT MAX(invitation_id) FROM survey_invitation));
SELECT setval(pg_get_serial_sequence('survey_response',   'response_id'),   (SELECT MAX(response_id)   FROM survey_response));
