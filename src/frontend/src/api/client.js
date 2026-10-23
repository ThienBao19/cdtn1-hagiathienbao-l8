// LỚP CLIENT API DUY NHẤT – mọi lời gọi backend đi qua apiRequest (tìm "fetch(" trong pages/ phải ra rỗng).
// Hợp đồng lỗi phía backend: { "error": { "code", "message", "field"?, "details"? } } (docs/api-contract.md).
// Frontend rẽ nhánh theo error.code / status, KHÔNG theo câu chữ của message.
import { getToken, clearSession } from '../auth/session';

export class ApiError extends Error {
  constructor({ status, code, message, field, details }) {
    super(message);
    this.status = status; // 0 = không kết nối được
    this.code = code;
    this.field = field;
    this.details = details;
  }
  /** Lỗi tạm thời (mất kết nối, máy chủ lỗi) -> nên hiện nút Thử lại. */
  get retryable() {
    return this.status === 0 || this.status >= 500;
  }
}

const NETWORK_MESSAGE = 'Không kết nối được tới hệ thống. Kiểm tra mạng hoặc máy chủ rồi bấm Thử lại.';

/**
 * Gọi API backend.
 * @param {string} path Đường dẫn sau /api, ví dụ '/surveys/abc'.
 * @param {{method?: string, body?: object, query?: object, auth?: boolean}} [opts]
 *   auth = true: gửi kèm token; nhận 401 thì xoá phiên và phát sự kiện 'session-expired'.
 * @returns {Promise<any>} Thân JSON khi thành công.
 * @throws {ApiError} Mọi lỗi (kể cả mất mạng) đều quy về ApiError có code + message tiếng Việt.
 */
export async function apiRequest(path, { method = 'GET', body, query, auth = false } = {}) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params.set(k, v); });
  const url = `/api${path}${params.toString() ? `?${params}` : ''}`;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: NETWORK_MESSAGE });
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return data;

  const err = data?.error;
  if (res.status === 401 && auth) {
    clearSession();
    window.dispatchEvent(new Event('session-expired'));
  }
  if (!err) {
    // Backend tắt: proxy của Vite trả 5xx không có JSON -> coi như mất kết nối
    throw new ApiError({ status: res.status >= 500 ? 0 : res.status, code: 'NETWORK_ERROR', message: NETWORK_MESSAGE });
  }
  throw new ApiError({ status: res.status, ...err });
}
