import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../api/auth.api';
import { saveSession } from '../auth/session';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(params.get('het-han') ? 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.' : null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Vui lòng nhập tên đăng nhập và mật khẩu'); return; }
    setBusy(true); setError(null);
    try {
      const session = await login(username.trim(), password);
      saveSession(session);
      navigate(session.user.role === 'QUAN_LY' ? '/bao-cao' : '/phan-hoi', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form onSubmit={submit} noValidate>
        <h1>Đăng nhập</h1>
        <p className="muted">Dành cho Nhân viên chăm sóc khách hàng và Quản lý trung tâm.</p>
        <label>Tên đăng nhập<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
        <label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
    </div>
  );
}
