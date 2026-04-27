import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Moderation from './pages/Moderation';
import Broadcast from './pages/Broadcast';
import Config from './pages/Config';
import Analytics from './pages/Analytics';
import Logs from './pages/Logs';
import Login from './pages/Login';
import Support from './pages/Support';
import System from './pages/System';
import BannedUsers from './pages/BannedUsers';
import SuspendedUsers from './pages/SuspendedUsers';

const App = () => {
  const isAuthenticated = !!localStorage.getItem('admin_token');

  return (
    <Router>
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
    </Router>
  );
};

export default App;
