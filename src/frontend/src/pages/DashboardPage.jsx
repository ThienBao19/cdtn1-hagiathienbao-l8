// M3 – Dashboard CSAT/NPS cho Quản lý trung tâm (US6 UC4, US7 UC5).
// Nguyên tắc trình bày (Buổi 9): tiêu đề là câu kết luận · mỗi số có mốc so sánh (tháng trước, toàn hệ thống)
// · nêu nguồn và giới hạn dữ liệu · dẫn tới hành động (KTV điểm thấp lên đầu, bấm sang danh sách phản hồi).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getMonthlyTrend, getTechnicianReport } from '../api/reports.api';
import { getUser } from '../auth/session';
import { useAsync } from '../components/useAsync';
import DataState from '../components/DataState.jsx';
import { fmtAvg, fmtDelta, fmtMonth, fmtNps, fmtPct } from '../components/format';

const LEVEL = { SO_CAP: 'Sơ cấp', TRUNG_CAP: 'Trung cấp', CAO_CAP: 'Cao cấp' };

/** Tháng trước so với hôm nay (giờ Việt Nam), dạng YYYY-MM – tháng gần nhất đã có đủ dữ liệu. */
function lastFullMonth() {
  const vn = new Date(Date.now() + 7 * 3600e3);
  const d = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

function Delta({ cur, prev, unit, digits }) {
  const d = fmtDelta(cur, prev, unit, digits);
  if (!d) return <span className="muted">chưa có số tháng trước</span>;
  return <span className={d.value > 0 ? 'up' : d.value < 0 ? 'down' : ''}>{d.text}</span>;
}

function Kpi({ title, value, cur, prev, system, unit, digits, fmt }) {
  return (
    <div className="kpi">
      <span className="kpi-title">{title}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-ctx">So với tháng trước: <Delta cur={cur} prev={prev} unit={unit} digits={digits} /></span>
      <span className="kpi-ctx">Toàn hệ thống cùng tháng: {fmt(system)}</span>
    </div>
  );
}

export default function DashboardPage() {
  const user = getUser();
  const [month, setMonth] = useState(lastFullMonth());
  const tech = useAsync(() => getTechnicianReport(month), [month]);
  const trend = useAsync(() => getMonthlyTrend(`${month.slice(0, 4)}-01`, month), [month]);

  const loading = tech.loading || trend.loading;
  const error = tech.error || trend.error;
  const retry = () => { tech.reload(); trend.reload(); };
  const cur = tech.data?.center.current;
  const prev = tech.data?.center.previous;
  const sys = trend.data?.find((m) => m.month === month)?.system;
  const totalYear = trend.data?.reduce((a, m) => a + m.center.responses, 0) ?? 0;

  const headline = () => {
    if (!cur?.responses) return '';
    const d = fmtDelta(cur.csatRate, prev?.csatRate, ' điểm phần trăm');
    const vsSys = sys?.csatRate !== null && sys?.csatRate !== undefined
      ? (cur.csatRate >= sys.csatRate ? 'cao hơn' : 'thấp hơn') + ` mức toàn hệ thống (${fmtPct(sys.csatRate)})` : '';
    return `Tháng ${fmtMonth(month)}: tỉ lệ khách hài lòng ${fmtPct(cur.csatRate)}`
      + (d ? `, ${d.value >= 0 ? 'tăng' : 'giảm'} ${d.text.replace(/^[▲▼■] [+−]?/, '')} so với tháng ${fmtMonth(tech.data.previousMonth)}` : '')
      + (vsSys ? `, ${vsSys}` : '') + '.';
  };

  return (
    <section>
      <div className="dash-head">
        <h1>Dashboard CSAT/NPS – {user?.center_name}</h1>
        <label>Tháng
          <input type="month" value={month} max={new Date().toISOString().slice(0, 7)}
            onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      </div>

      <DataState
        loading={loading}
        error={error}
        onRetry={retry}
        isEmpty={!loading && !error && cur?.responses === 0 && totalYear === 0}
        emptyTitle={`Chưa có phản hồi khảo sát nào của trung tâm từ 01/${month.slice(0, 4)} đến ${fmtMonth(month)}`}
        emptyHint="Chọn tháng khác, hoặc chờ khách trả lời các lời mời khảo sát mới."
      >
        {tech.data && trend.data && (
          <>
            {cur.responses > 0
              ? <p className="headline">{headline()}</p>
              : <p className="headline">Tháng {fmtMonth(month)} chưa có phản hồi khảo sát nào của trung tâm – xem xu hướng các tháng trước bên dưới.</p>}

            <div className="kpis">
              <Kpi title="Tỉ lệ CSAT (khách chấm 4–5)" value={fmtPct(cur.csatRate)} cur={cur.csatRate} prev={prev.csatRate}
                system={sys?.csatRate} unit=" điểm" digits={1} fmt={fmtPct} />
              <Kpi title="CSAT trung bình (thang 1–5)" value={fmtAvg(cur.csatAvg)} cur={cur.csatAvg} prev={prev.csatAvg}
                system={sys?.csatAvg} unit="" digits={2} fmt={fmtAvg} />
              <Kpi title="Chỉ số NPS (−100 đến +100)" value={fmtNps(cur.nps)} cur={cur.nps} prev={prev.nps}
                system={sys?.nps} unit="" digits={0} fmt={fmtNps} />
            </div>

            <h2>Theo kỹ thuật viên – tháng {fmtMonth(month)} (điểm thấp nhất lên đầu)</h2>
            {tech.data.technicians.length === 0 ? (
              <div className="state state-empty"><strong>Không có kỹ thuật viên nào có phản hồi trong tháng {fmtMonth(month)} hoặc tháng trước.</strong></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Kỹ thuật viên</th><th>Bậc</th><th className="num">Phản hồi</th><th className="num">CSAT TB</th>
                      <th className="num">So với tháng trước</th><th className="num">Tỉ lệ CSAT</th><th className="num">NPS</th></tr>
                  </thead>
                  <tbody>
                    {tech.data.technicians.map((t) => {
                      const below = t.current.csatRate !== null && cur.csatRate !== null && t.current.csatRate < cur.csatRate;
                      return (
                        <tr key={t.id} className={below ? 'flagged' : ''}>
                          <td>{t.name}{below && <span className="badge">Dưới mức trung tâm</span>}</td>
                          <td>{LEVEL[t.level]}</td>
                          <td className="num">{t.current.responses}</td>
                          <td className="num">{fmtAvg(t.current.csatAvg)}</td>
                          <td className="num"><Delta cur={t.current.csatAvg} prev={t.previous.csatAvg} unit="" digits={2} /></td>
                          <td className="num">{fmtPct(t.current.csatRate)}</td>
                          <td className="num">{fmtNps(t.current.nps)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="muted small">Mốc so sánh: tỉ lệ CSAT chung của trung tâm tháng này là {fmtPct(cur.csatRate)}; dòng tô màu là kỹ thuật viên thấp hơn mức đó.
              {' '}<Link to="/phan-hoi">Xem danh sách phản hồi để gọi lại khách điểm thấp →</Link></p>

            <h2>Xu hướng tỉ lệ CSAT theo tháng – trung tâm so với toàn hệ thống</h2>
            <div className="trend">
              {trend.data.map((m) => (
                <div className="trend-row" key={m.month}>
                  <span className="trend-month">{fmtMonth(m.month)}</span>
                  <span className="trend-bar" title={`Trung tâm ${fmtPct(m.center.csatRate)} · Toàn hệ thống ${fmtPct(m.system.csatRate)}`}>
                    <i className="bar" style={{ width: `${m.center.csatRate ?? 0}%` }} />
                    {m.system.csatRate !== null && <i className="marker" style={{ left: `${m.system.csatRate}%` }} />}
                  </span>
                  <span className="trend-val">{m.center.responses ? fmtPct(m.center.csatRate) : 'chưa có'}</span>
                  <span className="trend-nps">NPS {fmtNps(m.center.nps)} <span className="muted">(HT {fmtNps(m.system.nps)})</span></span>
                </div>
              ))}
              <div className="legend"><i className="bar" /> Trung tâm <i className="marker" /> Toàn hệ thống (mốc tham chiếu)</div>
            </div>
            <p className="source">
              Nguồn: {totalYear} phản hồi khảo sát của {user?.center_name} từ 01/{month.slice(0, 4)} đến hết {fmtMonth(month)}, tính theo ngày khách gửi phản hồi.
              {' '}Tỉ lệ CSAT = % khách chấm 4–5; NPS = % chấm 9–10 trừ % chấm 0–6, chỉ tính phản hồi có chấm NPS (BR-L8-03).
              {' '}Tháng có ít phản hồi (dưới 10) nên đọc thận trọng.
            </p>
          </>
        )}
      </DataState>
    </section>
  );
}
