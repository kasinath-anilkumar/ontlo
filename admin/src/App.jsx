import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Moderation = lazy(() => import('./pages/Moderation'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const Config = lazy(() => import('./pages/Config'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Logs = lazy(() => import('./pages/Logs'));
const Login = lazy(() => import('./pages/Login'));
const Support = lazy(() => import('./pages/Support'));
const System = lazy(() => import('./pages/System'));
const BannedUsers = lazy(() => import('./pages/BannedUsers'));
const SuspendedUsers = lazy(() => import('./pages/SuspendedUsers'));

const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-admin-bg">
    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Loading</div>
  </div>
);

const App = () => {
  const isAuthenticated = !!localStorage.getItem('admin_token');

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/banned" element={<BannedUsers />} />
                    <Route path="/suspended" element={<SuspendedUsers />} />
                    <Route path="/moderation" element={<Moderation />} />
                    <Route path="/broadcast" element={<Broadcast />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/config" element={<Config />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/system" element={<System />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </AdminLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
