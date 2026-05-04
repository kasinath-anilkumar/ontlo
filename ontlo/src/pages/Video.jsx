/**
 * Route `/video`: main UI is rendered by `VideoContainer` in `AppLayout` (full-screen when on this path).
 * This outlet keeps the route valid for the router and document title; no duplicate video mount here.
 */
const Video = () => {
  return <div className="min-h-[50vh] w-full shrink-0" aria-hidden />;
};

export default Video;
