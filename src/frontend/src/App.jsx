import { Navigate, Route, Routes } from 'react-router-dom';
import { getUser } from './auth/session';
import Layout from './components/Layout.jsx';
import SurveyPage from './pages/SurveyPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ResponsesPage from './pages/ResponsesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

function RequireLogin({ children }) {
  return getUser() ? children : <Navigate to="/dang-nhap" replace />;
}
const home = () => (getUser()?.role === 'QUAN_LY' ? '/bao-cao' : '/phan-hoi');

export default function App() {
  return (
    <Routes>
      {/* M1 – khách mở link khảo sát, không cần đăng nhập */}
      <Route path="/khao-sat/:token" element={<SurveyPage />} />
      <Route path="/dang-nhap" element={<LoginPage />} />
      <Route element={<RequireLogin><Layout /></RequireLogin>}>
        <Route path="/phan-hoi" element={<ResponsesPage />} />   {/* M2 */}
        <Route path="/bao-cao" element={<DashboardPage />} />    {/* M3 */}
      </Route>
      <Route path="*" element={<Navigate to={getUser() ? home() : '/dang-nhap'} replace />} />
    </Routes>
  );
}
