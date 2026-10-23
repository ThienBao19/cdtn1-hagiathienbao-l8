// Lưu phiên đăng nhập trong sessionStorage (tự xoá khi đóng tab). Không ghi token vào mã nguồn.
// Mọi thao tác đọc/ghi bọc try/catch: trình duyệt chặn storage thì coi như chưa đăng nhập.
const KEY = 'l8.session';

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}
export const getToken = () => getSession()?.token ?? null;
export const getUser = () => getSession()?.user ?? null;

export function saveSession(session) {
  try { sessionStorage.setItem(KEY, JSON.stringify(session)); } catch { /* bỏ qua */ }
}
export function clearSession() {
  try { sessionStorage.removeItem(KEY); } catch { /* bỏ qua */ }
}
