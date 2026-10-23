-- =====================================================================
-- Seed 003 – tài khoản mẫu (TẠO TỰ ĐỘNG bởi gen-sample-data.js). Mật khẩu mẫu: Matkhau@123
-- Chỉ dùng cho môi trường học tập cục bộ; mật khẩu lưu dạng băm scrypt.
-- =====================================================================
INSERT INTO app_user (username, password_hash, full_name, role, center_id) VALUES
  ('nv.q10', 'scrypt$80cef72fb1be8b5eec1dc65d6b55502e$9221f0586348f7c9dd1cdec438b487a38691727dd852e84ec82c9fcced1b6b75', 'Nguyễn Thị Lan', 'NHAN_VIEN', 1),
  ('ql.q10', 'scrypt$fe11f000d3565554a9a81643b3c2a9e7$94e688930b13cb78d2c6ca396bbf99e86bd99b7a8d19d8ef2c394ab3168e0f1a', 'Trần Minh Khoa', 'QUAN_LY', 1),
  ('nv.tb', 'scrypt$bd37909a6a95b78c125e588afd153def$55a24698b93f976e2714e17ca067d097f78681846891a4e16f07414654432c4f', 'Lê Thu Hà', 'NHAN_VIEN', 2),
  ('ql.tb', 'scrypt$0b06fa279d54a28ad9fce9f4d17c77a4$772c25534a3f84acd665618bec47d6c3d148d172a0ec1b8eb6be3bda5528ebe3', 'Võ Thị Trâm', 'QUAN_LY', 2)
ON CONFLICT (username) DO NOTHING;
