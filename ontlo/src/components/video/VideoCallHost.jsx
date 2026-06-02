import { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCallOverlay } from '../../context/CallOverlayContext';

const VideoContainer = lazy(() => import('./VideoContainer'));

const VideoCallHost = () => {
  const { pathname } = useLocation();
  const { shouldMountCallUi, setShouldMountCallUi } = useCallOverlay();

  useEffect(() => {
    if (pathname === '/video') {
      setShouldMountCallUi(true);
    }
  }, [pathname, setShouldMountCallUi]);

  if (!shouldMountCallUi) return null;

  return (
    <Suspense fallback={null}>
      <VideoContainer />
    </Suspense>
  );
};

export default VideoCallHost;
