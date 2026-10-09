-- =====================================================================
-- SQL DDL skeleton – Khảo sát hài lòng CSAT/NPS (luồng L8, track SE)
-- PostgreSQL 16 · chuẩn 3NF · khớp ERD docs/erd.drawio
-- Không lưu giá trị tính được: trạng thái lời mời, hạn trả lời
-- (= created_at + 7 ngày), nhãn "Cần chăm sóc", tỉ lệ CSAT, chỉ số NPS.
-- =====================================================================

-- Trung tâm bảo hành (dùng chung với L2/L4, L8 chỉ đọc)
CREATE TABLE service_center (
    center_id    SERIAL       PRIMARY KEY,
    center_code  VARCHAR(10)  NOT NULL UNIQUE,
    center_name  VARCHAR(120) NOT NULL,
    city         VARCHAR(60)  NOT NULL
);

-- Kỹ thuật viên – chiều tổng hợp chỉ số (FR6)
CREATE TABLE technician (
    technician_id BIGSERIAL    PRIMARY KEY,
    center_id     INT          NOT NULL REFERENCES service_center(center_id),
    full_name     VARCHAR(120) NOT NULL,
    level         VARCHAR(10)  NOT NULL CHECK (level IN ('SO_CAP','TRUNG_CAP','CAO_CAP')),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE          -- QT-13: không xoá vật lý
);

-- Khách hàng – khóa nhân tạo, số điện thoại chỉ UNIQUE (QT-01, QT-02)
CREATE TABLE customer (
    customer_id  BIGSERIAL    PRIMARY KEY,
    full_name    VARCHAR(120) NOT NULL,
    phone        VARCHAR(10)  NOT NULL UNIQUE CHECK (phone ~ '^0[0-9]{9}$'),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Phiếu bảo hành (dữ liệu của L2/L4; L8 chỉ đọc phiếu Đã đóng)
CREATE TABLE ticket (
    ticket_id     BIGSERIAL    PRIMARY KEY,
    ticket_code   VARCHAR(20)  NOT NULL UNIQUE CHECK (ticket_code ~ '^BH-[0-9]{6}/[0-9]{4}$'),
    center_id     INT          NOT NULL REFERENCES service_center(center_id),
    technician_id BIGINT       NULL     REFERENCES technician(technician_id),
    customer_id   BIGINT       NOT NULL REFERENCES customer(customer_id),
    device_model  VARCHAR(120) NOT NULL,
    status        VARCHAR(20)  NOT NULL CHECK (status IN
                  ('MOI','DA_PHAN_CONG','DANG_XU_LY','CHO_LINH_KIEN','HOAN_TAT','DA_DONG','DA_HUY')),
    received_at   TIMESTAMPTZ  NOT NULL,
    closed_at     TIMESTAMPTZ  NULL,
    CONSTRAINT ck_ticket_closed CHECK (status <> 'DA_DONG' OR closed_at IS NOT NULL)
);
CREATE INDEX ix_ticket_center_closed ON ticket (center_id, closed_at);   -- NFR2: lọc theo trung tâm/thời gian
CREATE INDEX ix_ticket_technician    ON ticket (technician_id);          -- NFR2: tổng hợp theo kỹ thuật viên

-- Lời mời khảo sát – mỗi phiếu đúng 1 lời mời (QT-10, NFR5)
CREATE TABLE survey_invitation (
    invitation_id BIGSERIAL   PRIMARY KEY,
    ticket_id     BIGINT      NOT NULL UNIQUE REFERENCES ticket(ticket_id),
    token         CHAR(64)    NOT NULL UNIQUE CHECK (token ~ '^[0-9a-f]{64}$'),   -- NFR4
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phản hồi khảo sát – mỗi lời mời tối đa 1 phản hồi (NFR5, BR-L8-02, BR-L8-05)
CREATE TABLE survey_response (
    response_id   BIGSERIAL    PRIMARY KEY,
    invitation_id BIGINT       NOT NULL UNIQUE REFERENCES survey_invitation(invitation_id),
    csat_score    SMALLINT     NOT NULL CHECK (csat_score BETWEEN 1 AND 5),
    nps_score     SMALLINT     NULL     CHECK (nps_score BETWEEN 0 AND 10),
    comment       VARCHAR(500) NULL,
    responded_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_response_responded_at ON survey_response (responded_at);  -- NFR2: lọc khoảng ngày, sắp xếp mới nhất
CREATE INDEX ix_response_csat         ON survey_response (csat_score);    -- NFR2: lọc CSAT tối đa
