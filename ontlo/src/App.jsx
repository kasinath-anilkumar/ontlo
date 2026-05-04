import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from "./context/SocketContext";
import { Loader2 } from "lucide-react";

// Lazy load components
const AppLayout = lazy(() => import("./components/layout/AppLayout"));
const Home = lazy(() => import("./pages/Home"));
const Video = lazy(() => import("./pages/Video"));
const Connections = lazy(() => import("./pages/Connections"));
const Messages = lazy(() => import("./pages/Messages"));
const Profile = lazy(() => import("./pages/Profile"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const WhoLikedYou = lazy(() => import("./pages/WhoLikedYou"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-[#0B0E14]">
    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
  </div>
);

const ProtectedRoute = ({ children, requiresProfile = true }) => {
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (!storedUser) {
    return <Navigate to="/auth" replace />;
  }
  
  if (requiresProfile && !storedUser.isProfileComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
};

function App() {
  return (
    <SocketProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/video" element={<Video />} />
                    <Route path="/connections" element={<Connections />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/who-liked-you" element={<WhoLikedYou />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </SocketProvider>
  );
}

export default App;