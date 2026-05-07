export const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : window.location.origin);

const pendingRequests = new Map();
let refreshPromise = null;

export const apiFetch = async (url, options = {}) => {
  // 1. Deduplicate concurrent identical requests
  const requestKey = `${options.method || 'GET'}:${url}`;
  if (pendingRequests.has(requestKey)) {
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
        const currentToken = localStorage.getItem("token");
        console.warn('[Auth] 401 Unauthorized received', { 
          url, 
          hasTokenInStorage: !!currentToken,
          tokenMatches: currentToken === token 
        });
        
        console.warn('[Auth] Token expired, attempting silent refresh...', { url, tokenExists: !!token });
        
        // Synchronize multiple refresh attempts
        if (!refreshPromise) {
          refreshPromise = fetch(`${API_URL}/api/auth/refresh-token`, {
            method: 'POST',
            credentials: 'include'
          }).then(async res => {
            if (res.ok) {
              const data = await res.json();
              if (data.token) {
                localStorage.setItem("token", data.token);
                return data.token;
              }
            }
            console.error('[Auth] Refresh response not OK:', res.status, res.statusText);
            throw new Error('Refresh failed');
          }).catch(err => {
            console.error('[Auth] Refresh error:', err);
            throw err;
          }).finally(() => {
            refreshPromise = null;
          });
        }

        try {
          const newToken = await refreshPromise;
          config.headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, config);
        } catch (err) {
          // Refresh failed, clear session
          console.error('[Auth] Token refresh failed, logging out', err);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth-expired'));
        }
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
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
