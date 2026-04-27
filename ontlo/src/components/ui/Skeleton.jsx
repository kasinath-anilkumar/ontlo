import React from 'react';

const Skeleton = ({ className, circle = false }) => {
  return (
    <div 
      className={`bg-[#151923] animate-pulse overflow-hidden relative ${circle ? 'rounded-full' : 'rounded-xl'} ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
    </div>
  );
};

export default Skeleton;
