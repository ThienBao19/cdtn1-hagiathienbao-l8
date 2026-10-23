-- =====================================================================
-- Migration 002 – tài khoản đăng nhập cho Nhân viên và Quản lý trung tâm (TD-14)
-- BT1 chỉ ghi "đọc vai trò + center_id từ JWT" nhưng chưa có bảng lưu tài khoản.
-- Mật khẩu chỉ lưu dạng băm scrypt (salt riêng từng tài khoản), không lưu bản rõ.
-- =====================================================================
CREATE TABLE IF NOT EXISTS app_user (
    user_id       SERIAL       PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    full_name     VARCHAR(120) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('NHAN_VIEN','QUAN_LY')),
    center_id     INT          NOT NULL REFERENCES service_center(center_id),  -- QT-14: phạm vi xem dữ liệu
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE                          -- QT-13: không xoá vật lý
);
