export const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : window.location.origin);

const pendingRequests = new Map();
let refreshPromise = null;

export const apiFetch = async (url, options = {}) => {
  // 1. Deduplicate concurrent identical requests
  // Skip deduplication if a signal is provided to avoid React Strict Mode mount/unmount race conditions
  const requestKey = `${options.method || 'GET'}:${url}`;
  if (!options.signal && pendingRequests.has(requestKey)) {
    const response = await pendingRequests.get(requestKey);
    return response.clone();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s for cold starts

  const token = localStorage.getItem("token");
  const config = {
    ...options,
    signal: controller.signal,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    }
  };

  const executeRequest = async () => {
    try {
      let response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Handle 401 Unauthorized (Token Expiry)
      const isAuthRequest = url.includes('/login') || url.includes('/register') || url.includes('/setup') || url.includes('/refresh-token');
      
      if (response.status === 401 && !isAuthRequest) {
        console.warn(`[Auth] 401 Unauthorized for ${url}, attempting refresh...`);
        
        // Synchronize multiple refresh attempts
        if (!refreshPromise) {
          console.log('[Auth] Starting refresh token request...');
          refreshPromise = fetch(`${API_URL}/api/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }).then(async res => {
            if (res.ok) {
              const data = await res.json();
              if (data.token) {
                console.log('[Auth] Refresh successful, new token received');
                localStorage.setItem("token", data.token);
                return data.token;
              }
            }
            const errorData = await res.json().catch(() => ({}));
            console.error('[Auth] Refresh failed with status:', res.status, errorData);
            throw new Error(errorData.error || 'Refresh failed');
          }).catch(err => {
            console.error('[Auth] Refresh error:', err.message);
            throw err;
          }).finally(() => {
            refreshPromise = null;
          });
        }

        try {
          const newToken = await refreshPromise;
          console.log(`[Auth] Retrying original request: ${url}`);
          const newConfig = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${newToken}`
            }
          };
          response = await fetch(url, newConfig);
        } catch (err) {
          console.error('[Auth] Token refresh failed, logging out');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth-expired'));
          // Important: after logout, we should probably redirect or at least return the 401
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error(`[API] HTML received instead of JSON for ${url}. This often means a 404 or server error handled by a fallback.`, {
          status: response.status,
          statusText: response.statusText,
          url
        });
        // Return a mock response that behaves like an error JSON
        return new Response(JSON.stringify({ 
          error: `Server returned HTML (${response.status}). The requested route might not exist or the server is misconfigured.`,
          isHtml: true 
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(`[API] Fetch error for ${url}:`, err.message);
      if (err.name === 'AbortError') {
        return new Response(JSON.stringify({ error: 'Aborted' }), { status: 499 });
      }
      throw err;
    } finally {
      pendingRequests.delete(requestKey);
    }
  };

  const requestPromise = executeRequest();
  pendingRequests.set(requestKey, requestPromise);
  
  return requestPromise;
};

export default API_URL;
