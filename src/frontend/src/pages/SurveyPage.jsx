// M1 – Trang khảo sát cho khách (UC2, US2–US4). Thiết kế cho màn hình 360 px (NFR3).
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSurvey, submitResponse } from '../api/survey.api';
import { useAsync } from '../components/useAsync';
import DataState from '../components/DataState.jsx';
import { fmtDate } from '../components/format';

const CSAT_LABELS = ['Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];
const COMMENT_MAX = 500; // BR-L8-02

/** Lỗi nghiệp vụ khi mở link: hiện thông điệp riêng, không có nút Thử lại (thử lại cũng không đổi kết quả). */
function ClosedNotice({ error }) {
  const title = {
    INVITATION_NOT_FOUND: 'Link khảo sát không hợp lệ',
    INVITATION_EXPIRED: 'Link khảo sát đã hết hạn',
    ALREADY_RESPONDED: 'Bạn đã gửi đánh giá cho phiếu này',
  }[error.code];
  return (
    <div className="state state-empty">
      <strong>{title}</strong>
      {error.code === 'ALREADY_RESPONDED' && error.details && (
        <p>Điểm bạn đã chấm: CSAT {error.details.csat_score}/5
          {error.details.nps_score !== null && error.details.nps_score !== undefined && ` · giới thiệu ${error.details.nps_score}/10`}.</p>
      )}
      {error.code === 'INVITATION_EXPIRED' && <p>Lời mời chỉ có hiệu lực 7 ngày kể từ khi phiếu bảo hành được đóng. Cảm ơn bạn đã quan tâm.</p>}
      {error.code === 'INVITATION_NOT_FOUND' && <p>Vui lòng kiểm tra lại đường link trong tin nhắn của Mekong Mobile.</p>}
    </div>
  );
}

export default function SurveyPage() {
  const { token } = useParams();
  const survey = useAsync(() => getSurvey(token), [token]);
  const [csat, setCsat] = useState(null);
  const [nps, setNps] = useState(null);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const [closed, setClosed] = useState(null); // lỗi nghiệp vụ xảy ra lúc gửi (vừa hết hạn / đã gửi ở tab khác)

  const submit = async (e) => {
    e.preventDefault();
    if (!csat) { setFormError('Vui lòng chọn mức hài lòng'); return; } // AC2.4 – giữ nguyên dữ liệu đã nhập
    if (comment.trim().length > COMMENT_MAX) { setFormError(`Nhận xét tối đa ${COMMENT_MAX} ký tự`); return; }
    setSending(true); setFormError(null);
    try {
      setDone(await submitResponse(token, { csatScore: csat, npsScore: nps, comment }));
    } catch (err) {
      if (['ALREADY_RESPONDED', 'INVITATION_EXPIRED', 'INVITATION_NOT_FOUND'].includes(err.code)) setClosed(err);
      else setFormError(err.message); // mất kết nối: giữ dữ liệu, bấm Gửi lại được (luồng 7a)
    } finally {
      setSending(false);
    }
  };

  const businessError = survey.error && ['INVITATION_NOT_FOUND', 'INVITATION_EXPIRED', 'ALREADY_RESPONDED'].includes(survey.error.code);

  return (
    <div className="survey">
      <h1>Đánh giá dịch vụ bảo hành</h1>
      {businessError ? <ClosedNotice error={survey.error} /> : (
        <DataState loading={survey.loading} error={survey.error} onRetry={survey.reload}>
          {closed ? <ClosedNotice error={closed} /> : done ? (
            <div className="state state-done">
              <strong>Cảm ơn bạn đã đánh giá!</strong>
              <p>Phản hồi cho phiếu {done.ticketCode} đã được ghi nhận.
                {done.isFlagged && ' Bộ phận chăm sóc khách hàng sẽ liên hệ lại với bạn.'}</p>
            </div>
          ) : survey.data && (
            <form onSubmit={submit} noValidate>
              <dl className="ticket">
                <dt>Phiếu</dt><dd>{survey.data.ticketCode}</dd>
                <dt>Trung tâm</dt><dd>{survey.data.centerName}</dd>
                <dt>Thiết bị</dt><dd>{survey.data.deviceModel}</dd>
                {survey.data.closedAt && <><dt>Ngày trả máy</dt><dd>{fmtDate(survey.data.closedAt)}</dd></>}
              </dl>

              <fieldset>
                <legend>1. Bạn hài lòng với lần bảo hành này ở mức nào? <span className="req">*</span></legend>
                <div className="scale csat">
                  {CSAT_LABELS.map((label, i) => (
                    <button type="button" key={label} aria-pressed={csat === i + 1}
                      className={csat === i + 1 ? 'on' : ''} onClick={() => { setCsat(i + 1); setFormError(null); }}>
                      <b>{i + 1}</b><small>{label}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>2. Bạn có sẵn lòng giới thiệu Mekong Mobile cho người quen? <span className="muted">(không bắt buộc)</span></legend>
                <div className="scale nps">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button type="button" key={i} aria-pressed={nps === i} className={nps === i ? 'on' : ''}
                      onClick={() => setNps(nps === i ? null : i)}>{i}</button>
                  ))}
                </div>
                <div className="scale-ends"><span>0 – Chắc chắn không</span><span>10 – Chắc chắn có</span></div>
              </fieldset>

              <fieldset>
                <legend>3. Nhận xét thêm <span className="muted">(không bắt buộc)</span></legend>
                <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Điều bạn hài lòng hoặc chưa hài lòng…" />
                <div className={`counter ${comment.trim().length > COMMENT_MAX ? 'over' : ''}`}>{comment.trim().length}/{COMMENT_MAX}</div>
              </fieldset>

              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button type="submit" className="primary" disabled={sending}>{sending ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
              <p className="muted small">Link có hiệu lực đến {fmtDate(survey.data.expiresAt)}.</p>
            </form>
          )}
        </DataState>
      )}
    </div>
  );
}
