import { lazy } from 'react';

/**
 * A wrapper for React.lazy that retries the import if it fails.
 * This helps recover from stale chunk / deployment mismatch issues.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(() =>
    componentImport().then((component) => {
      window.localStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    }).catch((error) => {
      console.error('Error loading lazy component:', error);

      const pageHasAlreadyBeenForceRefreshed = JSON.parse(
        window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
      );

      if (!pageHasAlreadyBeenForceRefreshed) {
        window.localStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }

      return Promise.reject(error);
    })
  );
