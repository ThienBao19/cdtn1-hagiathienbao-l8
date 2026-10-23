// Sinh dữ liệu mẫu mô phỏng có hạt giống cố định (seed 42) – chạy: npm run gen:sample
// Kết quả ghi đè seeds/002_sample_history.sql và seeds/003_app_user.sql (hai tệp này được commit,
// người dựng lại hệ thống KHÔNG cần chạy script này, chỉ cần npm run seed).
// Lý do có script: bộ CSV của case study chưa nằm trong repo; SRS mục 5 cho phép dùng
// "dữ liệu sinh mô phỏng với seed 42" (TD-16). Chạy lại script cho ra đúng cùng một nội dung.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('../services/password');

const SEEDS_DIR = path.resolve(__dirname, '../../../seeds');

// PRNG mulberry32 – cùng seed thì cùng chuỗi số, không phụ thuộc Math.random.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(42);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (a, b) => a + rnd() * (b - a);
const normal = (mean, sd) => {
  const u = 1 - rnd(); const v = rnd();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pad = (n, w) => String(n).padStart(w, '0');
const q = (s) => (s === null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
// Thời điểm theo giờ Việt Nam, ghi dạng ISO kèm +07:00
const vn = (ms) => {
  const d = new Date(ms + 7 * 3600e3);
  return `${d.toISOString().slice(0, 19)}+07:00`;
};

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM = ['Văn', 'Thị', 'Minh', 'Quốc', 'Thanh', 'Ngọc', 'Gia', 'Hoàng', 'Thu', 'Đức', 'Hữu', 'Kim'];
const TEN = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu', 'Hoa', 'Huy', 'Khánh', 'Lan', 'Linh',
  'Long', 'Mai', 'Nam', 'Nga', 'Nhi', 'Phong', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Trung', 'Tú', 'Vy', 'Yến'];
const DEVICES = ['iPhone 13 128GB', 'iPhone 14 Pro', 'iPhone 15', 'Samsung Galaxy A54', 'Samsung Galaxy S23', 'Samsung Galaxy A15',
  'Xiaomi Redmi Note 12', 'Xiaomi 13T', 'OPPO Reno10', 'OPPO A78', 'vivo Y36', 'Realme C55', 'iPad Gen 9', 'Samsung Galaxy Tab A9'];
const COMMENT_BAD = ['Hẹn trả máy trễ, không báo trước.', 'Nhân viên giải thích chưa rõ lỗi.', 'Phải chờ lâu ở quầy.',
  'Máy sửa xong vẫn còn lỗi cũ.', 'Gọi tổng đài nhiều lần không ai nghe.'];
const COMMENT_MID = ['Sửa được nhưng hơi lâu.', 'Ổn, cần báo tiến độ thường xuyên hơn.', 'Bình thường.'];
const COMMENT_GOOD = ['Sửa nhanh, nhân viên tư vấn kỹ.', 'Hài lòng, đúng hẹn.', 'Kỹ thuật viên nhiệt tình.', 'Rất chuyên nghiệp.'];
const fullName = () => `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`;

// ---------- Kỹ thuật viên: 3 người mỗi trung tâm, id 101–118 ----------
const LEVELS = ['SO_CAP', 'TRUNG_CAP', 'CAO_CAP'];
const technicians = [];
for (let c = 1; c <= 6; c++) {
  for (let k = 0; k < 3; k++) {
    const id = 100 + (c - 1) * 3 + k + 1;
    const level = LEVELS[k];
    // "chất lượng" ẩn của KTV quyết định phân bố điểm CSAT
    const quality = { SO_CAP: 3.5, TRUNG_CAP: 3.95, CAO_CAP: 4.35 }[level] + between(-0.25, 0.25);
    technicians.push({ id, center: c, name: fullName(), level, quality });
  }
}

// ---------- Khách hàng: id 1001–1400 ----------
const customers = [];
for (let id = 1001; id <= 2200; id++) {
  customers.push({ id, name: fullName(), phone: `03${pad((id * 7919) % 100000000, 8)}` });
}

// ---------- Phiếu, lời mời, phản hồi ----------
const START = Date.UTC(2026, 0, 5, 1);   // 05/01/2026 08:00 giờ VN
const END = Date.UTC(2026, 9, 15, 10);   // 15/10/2026 17:00 giờ VN
const CENTER_WEIGHT = [0.24, 0.2, 0.16, 0.16, 0.1, 0.14];
const pickCenter = () => {
  let r = rnd();
  for (let i = 0; i < CENTER_WEIGHT.length; i++) { r -= CENTER_WEIGHT[i]; if (r <= 0) return i + 1; }
  return 6;
};
const tickets = []; const invitations = []; const responses = [];
for (let id = 10001; id <= 12400; id++) { // ~260 phiếu/tháng như case study
  const received = START + rnd() * (END - START);
  const center = pickCenter();
  const tech = pick(technicians.filter((t) => t.center === center));
  const customer = pick(customers);
  const ageDays = (END - received) / 86400e3;
  const r = rnd();
  let status = 'DA_DONG';
  if (ageDays < 4) status = pick(['MOI', 'DA_PHAN_CONG', 'DANG_XU_LY', 'CHO_LINH_KIEN', 'HOAN_TAT']);
  else if (r < 0.03) status = 'DA_HUY';
  else if (r < 0.06) status = 'HOAN_TAT';
  const closed = status === 'DA_DONG' ? received + between(1, 6) * 86400e3 : null;
  tickets.push({ id, code: `BH-${pad(id, 6)}/2026`, center, tech: tech.id, customer: customer.id,
    device: pick(DEVICES), status, received, closed });
  if (!closed) continue;

  // Lời mời tạo 5 phút sau khi đóng phiếu (US1); token tất định để dữ liệu mẫu tái lập được
  const invCreated = closed + 5 * 60e3;
  const token = crypto.createHash('sha256').update(`l8-sample-${id}`).digest('hex');
  invitations.push({ id, ticket: id, token, created: invCreated });
  if (rnd() > 0.66) continue; // ~66% khách trả lời khảo sát

  // Tân Bình (2) giảm chất lượng tháng 8–9 để dashboard có xu hướng đáng chú ý
  const month = new Date(closed).getUTCMonth() + 1;
  const dip = center === 2 && (month === 8 || month === 9) ? 0.7 : 0;
  const csat = clamp(Math.round(normal(tech.quality - dip, 0.85)), 1, 5);
  const nps = rnd() < 0.85 ? clamp(Math.round((csat - 1) * 2.4 + normal(0.6, 1.3)), 0, 10) : null;
  let comment = null;
  if (rnd() < 0.4) comment = pick(csat <= 2 ? COMMENT_BAD : csat === 3 ? COMMENT_MID : COMMENT_GOOD);
  const responded = invCreated + between(0.05, 6.5) * 86400e3; // trả lời trong hạn 7 ngày (BR-L8-01)
  responses.push({ id, invitation: id, csat, nps, comment, responded });
}

// ---------- Ghi tệp SQL ----------
function inserts(table, cols, rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 200) {
    out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n  ${rows.slice(i, i + 200).join(',\n  ')}\nON CONFLICT DO NOTHING;`);
  }
  return out.join('\n\n');
}

const header = `-- =====================================================================
-- Seed 002 – lịch sử mô phỏng 01–10/2026 (TẠO TỰ ĐỘNG bởi src/backend/scripts/gen-sample-data.js, seed 42)
-- ${technicians.length} kỹ thuật viên · ${customers.length} khách hàng · ${tickets.length} phiếu · ${invitations.length} lời mời · ${responses.length} phản hồi
-- Khoá cố định + ON CONFLICT DO NOTHING: chạy lại không nhân đôi (C5). Không sửa tay tệp này.
-- =====================================================================`;
const sql = [header,
  inserts('technician', ['technician_id', 'center_id', 'full_name', 'level'],
    technicians.map((t) => `(${t.id}, ${t.center}, ${q(t.name)}, ${q(t.level)})`)),
  inserts('customer', ['customer_id', 'full_name', 'phone', 'created_at'],
    customers.map((c) => `(${c.id}, ${q(c.name)}, ${q(c.phone)}, '2026-01-01T08:00:00+07:00')`)),
  inserts('ticket', ['ticket_id', 'ticket_code', 'center_id', 'technician_id', 'customer_id', 'device_model', 'status', 'received_at', 'closed_at'],
    tickets.map((t) => `(${t.id}, ${q(t.code)}, ${t.center}, ${t.tech}, ${t.customer}, ${q(t.device)}, ${q(t.status)}, ${q(vn(t.received))}, ${t.closed ? q(vn(t.closed)) : 'NULL'})`)),
  inserts('survey_invitation', ['invitation_id', 'ticket_id', 'token', 'created_at'],
    invitations.map((i) => `(${i.id}, ${i.ticket}, ${q(i.token)}, ${q(vn(i.created))})`)),
  inserts('survey_response', ['response_id', 'invitation_id', 'csat_score', 'nps_score', 'comment', 'responded_at'],
    responses.map((r) => `(${r.id}, ${r.invitation}, ${r.csat}, ${r.nps === null ? 'NULL' : r.nps}, ${q(r.comment)}, ${q(vn(r.responded))})`)),
  ['service_center:center_id', 'technician:technician_id', 'customer:customer_id', 'ticket:ticket_id',
    'survey_invitation:invitation_id', 'survey_response:response_id']
    .map((s) => { const [t, c] = s.split(':'); return `SELECT setval(pg_get_serial_sequence('${t}', '${c}'), (SELECT MAX(${c}) FROM ${t}));`; })
    .join('\n'),
].join('\n\n') + '\n';
fs.writeFileSync(path.join(SEEDS_DIR, '002_sample_history.sql'), sql);

// ---------- Tài khoản mẫu (seed 003) ----------
const DEMO_PASSWORD = 'Matkhau@123';
const users = [
  ['nv.q10', 'Nguyễn Thị Lan', 'NHAN_VIEN', 1],
  ['ql.q10', 'Trần Minh Khoa', 'QUAN_LY', 1],
  ['nv.tb', 'Lê Thu Hà', 'NHAN_VIEN', 2],
  ['ql.tb', 'Võ Thị Trâm', 'QUAN_LY', 2],
];
const userSql = `-- =====================================================================
-- Seed 003 – tài khoản mẫu (TẠO TỰ ĐỘNG bởi gen-sample-data.js). Mật khẩu mẫu: ${DEMO_PASSWORD}
-- Chỉ dùng cho môi trường học tập cục bộ; mật khẩu lưu dạng băm scrypt.
-- =====================================================================
INSERT INTO app_user (username, password_hash, full_name, role, center_id) VALUES
  ${users.map(([u, n, r, c]) => {
    const salt = crypto.createHash('sha256').update(`salt-${u}`).digest('hex').slice(0, 32);
    return `(${q(u)}, ${q(hashPassword(DEMO_PASSWORD, salt))}, ${q(n)}, ${q(r)}, ${c})`;
  }).join(',\n  ')}
ON CONFLICT (username) DO NOTHING;
`;
fs.writeFileSync(path.join(SEEDS_DIR, '003_app_user.sql'), userSql);

console.log(`Đã ghi seeds/002_sample_history.sql: ${tickets.length} phiếu, ${invitations.length} lời mời, ${responses.length} phản hồi`);
console.log('Đã ghi seeds/003_app_user.sql: 4 tài khoản mẫu');
