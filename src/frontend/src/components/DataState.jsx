// Bọc một vùng dữ liệu bằng ĐỦ BA TRẠNG THÁI (Buổi 9): đang tải · lỗi · rỗng – rồi mới tới "có dữ liệu".
// Thông báo lỗi gồm: chuyện gì (title) · vì sao (message từ backend) · làm gì tiếp (hint + nút Thử lại).

/**
 * @param {{loading: boolean, error: import('../api/client').ApiError|null, isEmpty?: boolean,
 *          emptyTitle?: string, emptyHint?: string, emptyAction?: React.ReactNode,
 *          onRetry?: () => void, children: React.ReactNode}} props
 */
export default function DataState({ loading, error, isEmpty, emptyTitle, emptyHint, emptyAction, onRetry, children }) {
  if (loading) {
    return (
      <div className="state state-loading" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>Đang tải dữ liệu…</span>
        <div className="skeleton" aria-hidden="true"><i /><i /><i /></div>
      </div>
    );
  }
  if (error) {
    const forbidden = error.status === 403;
    return (
      <div className="state state-error" role="alert">
        <strong>{forbidden ? 'Bạn không có quyền xem nội dung này' : 'Không tải được dữ liệu'}</strong>
        <p>{error.message}</p>
        {error.retryable && (
          <>
            <p className="muted">Dữ liệu bạn đã nhập vẫn được giữ. Bấm Thử lại sau khi kết nối ổn định.</p>
            {onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}
          </>
        )}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="state state-empty">
        <strong>{emptyTitle || 'Chưa có dữ liệu'}</strong>
        {emptyHint && <p>{emptyHint}</p>}
        {emptyAction}
      </div>
    );
  }
  return children;
}
