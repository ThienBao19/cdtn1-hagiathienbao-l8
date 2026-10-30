// Logger JSON tối giản ghi ra stdout (Buổi 11): mỗi dòng một sự kiện, có THỜI ĐIỂM · MỨC · NGỮ CẢNH · MÔ TẢ.
// Không thêm thư viện: đủ cho prototype, docker compose logs đọc được.
// Tuyệt đối không ghi mật khẩu, token, số điện thoại: các khoá nhạy cảm bị che tự động (redact).
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const SENSITIVE = /pass(word)?|token|secret|authorization|phone|so_?dien_?thoai/i;

function redact(value, depth = 0) {
  if (value === null || typeof value !== 'object' || depth > 3) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, code: value.code, stack: value.stack };
  }
  const out = Array.isArray(value) ? [] : {};
  for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE.test(k) ? '[ĐÃ CHE]' : redact(v, depth + 1);
  return out;
}

/**
 * Tạo logger. Mức tối thiểu lấy từ LOG_LEVEL (mặc định info; khi chạy Jest mặc định silent để không làm rối kết quả test).
 * @param {{level?: string, write?: (line: string) => void}} [opts] write: nơi ghi (mặc định stdout) – test truyền hàm giả.
 */
function createLogger({ level, write = (line) => process.stdout.write(`${line}\n`) } = {}) {
  const min = LEVELS[level || process.env.LOG_LEVEL || (process.env.JEST_WORKER_ID ? 'silent' : 'info')] ?? LEVELS.info;
  const log = (lvl) => (context, msg) => {
    if (LEVELS[lvl] < min) return;
    write(JSON.stringify({ time: new Date().toISOString(), level: lvl, msg, ...redact(context || {}) }));
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}

const logger = createLogger();

module.exports = { logger, createLogger, redact };
