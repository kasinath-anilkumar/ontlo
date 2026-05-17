import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const PullToRefresh = ({ children, onRefresh }) => {
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const MAX_PULL = 80;
  const THRESHOLD = 60;

  const onTouchStart = (e) => {
    // Only allow pull to refresh if we are at the very top of the scroll container
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer && scrollContainer.scrollTop > 0) return;

    if (e.touches.length === 1) {
      setStartY(e.touches[0].clientY);
      setPulling(true);
    }
  };

  const onTouchMove = (e) => {
    if (!pulling || refreshing) return;
    
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer && scrollContainer.scrollTop > 0) {
      setPulling(false);
      setPullDistance(0);
      return;
    }

    const y = e.touches[0].clientY;
    const distance = y - startY;

    if (distance > 0) {
      // Add resistance to the pull
      const resisted = distance * 0.4;
      setPullDistance(Math.min(resisted, MAX_PULL));
      
      // Prevent default scrolling when pulling down
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const onTouchEnd = async () => {
    if (!pulling || refreshing) return;
    setPulling(false);

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD); // Hold at threshold while refreshing
      
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // If no custom refresh, force reload the app smoothly
          window.dispatchEvent(new Event('app-refresh'));
          // Fallback to reload after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      } catch (err) {
        console.error('Refresh failed', err);
      } finally {
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 500); // Give loader a little time before disappearing
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull To Refresh Loader */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center z-[100] transition-all duration-300 ease-out pointer-events-none"
        style={{
          transform: `translateY(${pullDistance > 0 ? pullDistance : -50}px)`,
          opacity: pullDistance > 0 ? Math.min(pullDistance / MAX_PULL, 1) : 0,
        }}
      >
        <div className="bg-[#151923] border border-white/10 rounded-full p-2.5 shadow-2xl backdrop-blur-xl">
          <Loader2 
            size={18} 
            className={`text-purple-500 ${refreshing ? 'animate-spin' : ''}`} 
            style={{ 
              transform: refreshing ? 'none' : `rotate(${pullDistance * 2}deg)` 
            }}
          />
        </div>
      </div>

      {/* Content wrapper with smooth spring-like translation */}
      <div 
        className="flex-1 w-full h-full transition-transform duration-300 ease-out"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
