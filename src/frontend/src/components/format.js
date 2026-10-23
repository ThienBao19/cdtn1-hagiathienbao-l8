// Định dạng số và ngày theo kiểu Việt Nam (dấu phẩy thập phân, dd/mm/yyyy).
const nf1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const fmtAvg = (v) => (v === null || v === undefined ? '—' : nf2.format(v));
export const fmtPct = (v) => (v === null || v === undefined ? '—' : `${nf1.format(v)}%`);
export const fmtNps = (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v}`);
export const fmtDateTime = (d) => d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d) => d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtMonth = (m) => `${m.slice(5)}/${m.slice(0, 4)}`;

/** Chênh lệch có dấu và đơn vị, null khi thiếu một trong hai số. */
export function fmtDelta(cur, prev, unit = '', digits = 1) {
  if (cur === null || prev === null || cur === undefined || prev === undefined) return null;
  const d = Math.round((cur - prev) * 10 ** digits) / 10 ** digits;
  const s = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(Math.abs(d));
  return { value: d, text: `${d > 0 ? '▲ +' : d < 0 ? '▼ −' : '■ '}${s}${unit}` };
}
