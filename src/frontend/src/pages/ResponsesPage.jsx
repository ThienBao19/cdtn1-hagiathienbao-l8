// M2 – Danh sách phản hồi khảo sát cho Nhân viên (US5, UC3, AC5.1–AC5.3).
import { useState } from 'react';
import { listResponses } from '../api/responses.api';
import { getUser } from '../auth/session';
import { useAsync } from '../components/useAsync';
import DataState from '../components/DataState.jsx';
import { fmtDateTime, fmtDate } from '../components/format';

const EMPTY_FILTER = { from: '', to: '', csatMax: '' };
const PAGE_SIZE = 20;

export default function ResponsesPage() {
  const user = getUser();
  const [draft, setDraft] = useState(EMPTY_FILTER);   // đang gõ trên form
  const [applied, setApplied] = useState(EMPTY_FILTER); // đã bấm Tìm
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState(null);

  const list = useAsync(() => listResponses({ ...applied, page, pageSize: PAGE_SIZE }), [applied, page]);
  const hasFilter = Boolean(applied.from || applied.to || applied.csatMax);

  const search = (e) => {
    e.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { // AC5.3 – kiểm ngay trên form, backend kiểm lần nữa
      setFormError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
      return;
    }
    setFormError(null); setPage(1); setApplied({ ...draft });
  };
  const clear = () => { setDraft(EMPTY_FILTER); setApplied(EMPTY_FILTER); setPage(1); setFormError(null); };

  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const flaggedOnPage = data ? data.items.filter((r) => r.needsCare).length : 0;

  return (
    <section>
      <h1>Phản hồi khảo sát – {user?.center_name}</h1>
      <form className="filters" onSubmit={search} noValidate>
        <label>Từ ngày<input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label>
        <label>Đến ngày<input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
        <label>CSAT tối đa
          <select value={draft.csatMax} onChange={(e) => setDraft({ ...draft, csatMax: e.target.value })}>
            <option value="">Tất cả</option>
            {[1, 2, 3, 4].map((v) => <option key={v} value={v}>≤ {v}{v === 2 ? ' (cần chăm sóc)' : ''}</option>)}
          </select>
        </label>
        <button type="submit" className="primary">Tìm</button>
        {hasFilter && <button type="button" onClick={clear}>Xoá bộ lọc</button>}
      </form>
      {formError && <p className="form-error" role="alert">{formError}</p>}

      <DataState
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        isEmpty={data?.total === 0}
        emptyTitle={hasFilter ? 'Không có phản hồi phù hợp' : 'Trung tâm chưa có phản hồi khảo sát nào'}
        emptyHint={hasFilter
          ? 'Tổng số = 0. Thử mở rộng khoảng thời gian hoặc bỏ điều kiện CSAT.'
          : 'Phản hồi sẽ xuất hiện khi khách trả lời lời mời khảo sát sau khi phiếu được đóng.'}
        emptyAction={hasFilter && <button type="button" onClick={clear}>Xoá bộ lọc</button>}
      >
        {data && (
          <>
            <p className="summary">
              <b>{data.total}</b> phản hồi{hasFilter && ' khớp bộ lọc'}
              {applied.from && ` từ ${fmtDate(new Date(applied.from))}`}{applied.to && ` đến ${fmtDate(new Date(applied.to))}`}
              {' · '}trang này có <b className="flag-text">{flaggedOnPage}</b> phản hồi cần chăm sóc (CSAT ≤ 2), ưu tiên gọi lại trước.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Thời gian</th><th>Phiếu</th><th>Khách hàng</th><th>Điện thoại</th><th>Kỹ thuật viên</th>
                    <th className="num">CSAT</th><th className="num">NPS</th><th>Nhận xét</th></tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id} className={r.needsCare ? 'flagged' : ''}>
                      <td className="nowrap">{fmtDateTime(r.respondedAt)}</td>
                      <td className="nowrap">{r.ticketCode}</td>
                      <td>{r.customerName}{r.needsCare && <span className="badge">Cần chăm sóc</span>}</td>
                      <td className="mono">{r.phone}</td>
                      <td>{r.technicianName ?? <span className="muted">Chưa gán</span>}</td>
                      <td className="num">{r.csat}/5</td>
                      <td className="num">{r.nps ?? <span className="muted">—</span>}</td>
                      <td className="comment">{r.comment ?? <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Trước</button>
              <span>Trang {page}/{pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau ›</button>
            </div>
          </>
        )}
      </DataState>
    </section>
  );
}
