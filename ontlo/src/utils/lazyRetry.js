import { lazy } from 'react';

/**
 * A wrapper for React.lazy that retries the import if it fails.
 * This is particularly useful for handling "Failed to fetch dynamically imported module" errors
 * which occur when a new version of the app is deployed and old chunks are removed from the server.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      
      // If we successfully loaded, reset the refresh flag
      window.localStorage.setItem('page-has-been-force-refreshed', 'false');
      
      return component;
    } catch (error) {
      console.error('Error loading lazy component:', error);

      // If we haven't refreshed yet, try refreshing the page
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.localStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }

      // If we already refreshed and it still fails, throw the error
      throw error;
    }
  });
