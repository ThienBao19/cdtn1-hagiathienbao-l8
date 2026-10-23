import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../auth/session';

const ROLE_LABEL = { NHAN_VIEN: 'Nhân viên', QUAN_LY: 'Quản lý trung tâm' };

/** Khung trang nội bộ (M2, M3): thanh điều hướng, người đăng nhập, đăng xuất. */
export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();

  // client.js phát 'session-expired' khi nhận 401 -> về trang đăng nhập (Buổi 10: nhận 401 thì xoá token)
  useEffect(() => {
    const onExpired = () => navigate('/dang-nhap?het-han=1', { replace: true });
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, [navigate]);

  const logout = () => { clearSession(); navigate('/dang-nhap', { replace: true }); };

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Mekong Mobile · Khảo sát hài lòng</span>
        <nav>
          <NavLink to="/phan-hoi">Danh sách phản hồi</NavLink>
          {user?.role === 'QUAN_LY' && <NavLink to="/bao-cao">Dashboard CSAT/NPS</NavLink>}
        </nav>
        <span className="who">
          {user?.full_name} · {ROLE_LABEL[user?.role]} · {user?.center_name}
          <button type="button" className="link" onClick={logout}>Đăng xuất</button>
        </span>
      </header>
      <main className="page"><Outlet /></main>
    </div>
  );
}
