import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider, useSocket } from "./context/SocketContext";
import { CallOverlayProvider } from "./context/CallOverlayContext";
import { FeedProvider } from "./context/FeedContext";
import { Loader2 } from "lucide-react";
import { lazyWithRetry as lazy } from "./utils/lazyRetry";

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
const CreatePost = lazy(() => import("./pages/CreatePost"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Settings = lazy(() => import("./pages/Settings"));
const Search = lazy(() => import("./pages/Search"));


const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-[#0B0E14]">
    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
  </div>
);

const ProtectedRoute = ({ children, requiresProfile = true }) => {
  const { user, isInitialLoad } = useSocket();
  const token = localStorage.getItem('token');
  
  // While initializing, we allow rendering so skeletons can show.
  // We only redirect if we are SURE the user is not logged in (isInitialLoad === false && !user)
  // or if we don't even have a token to begin with.
  if (isInitialLoad && token) {
    return children;
  }
  
  if (!isInitialLoad && !user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!isInitialLoad && requiresProfile && !user?.isProfileComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
};

function App() {
  return (
    <SocketProvider>
      <CallOverlayProvider>
      <FeedProvider>
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
                      {/* <Route path="/who-liked-you" element={<WhoLikedYou />} /> */}
                      <Route path="/favorites" element={<Favorites />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/create-post" element={<CreatePost />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </Router>
      </FeedProvider>
      </CallOverlayProvider>
    </SocketProvider>
  );
}

export default App;