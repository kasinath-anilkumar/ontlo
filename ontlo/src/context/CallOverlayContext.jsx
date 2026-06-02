import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CallOverlayContext = createContext(null);

export function CallOverlayProvider({ children }) {
  const [shouldMountCallUi, setShouldMountCallUi] = useState(false);
  const [callSessionActive, setCallSessionActive] = useState(false);

  const requestCallUi = useCallback(() => {
    setShouldMountCallUi(true);
  }, []);

  const value = useMemo(
    () => ({
      shouldMountCallUi,
      setShouldMountCallUi,
      callSessionActive,
      setCallSessionActive,
      requestCallUi,
    }),
    [shouldMountCallUi, callSessionActive, requestCallUi]
  );

  return (
    <CallOverlayContext.Provider value={value}>
      {children}
    </CallOverlayContext.Provider>
  );
}

export function useCallOverlay() {
  const ctx = useContext(CallOverlayContext);
  if (!ctx) {
    throw new Error('useCallOverlay must be used within CallOverlayProvider');
  }
  return ctx;
}
