import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SavedPage } from '@/pages/SavedPage';
import { LecturesPage } from '@/pages/LecturesPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LandingPage } from '@/pages/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page - standalone */}
        <Route path="/landing" element={<LandingPage />} />

        {/* Auth pages - standalone, no chrome */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* All app pages share one layout + transition */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/lectures" element={<LecturesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/pilgrimages" element={<SavedPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
