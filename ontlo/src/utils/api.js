const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
console.log('[API] Raw API URL from env:', rawApiUrl);
export const API_URL = /^https?:\/\//i.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`;
console.log('[API] Final Backend Target:', API_URL);

export const apiFetch = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  const token = localStorage.getItem("token");
  const config = {
    ...options,
    signal: controller.signal,
    credentials: 'include', // Important for HTTP-only cookies
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    }
  };

  try {
    let response = await fetch(url, config);
    clearTimeout(timeoutId);

  // If unauthorized, try to refresh token
  const isAuthRequest = url.includes('/login') || url.includes('/register') || url.includes('/setup') || url.includes('/refresh-token');
  
  if (response.status === 401 && !isAuthRequest) {
    try {
      console.log('[Auth] Token expired, attempting refresh...');
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include'
      });

      if (refreshRes.ok) {
        console.log('[Auth] Refresh successful, retrying original request');
        const data = await refreshRes.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          config.headers['Authorization'] = `Bearer ${data.token}`;
        }
        // Retry original request
        response = await fetch(url, config);
      } else {
        console.error('[Auth] Refresh failed, logging out');
        // Refresh failed, clear user state
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-expired'));
      }
    } catch (err) {
      console.error('[Auth] Refresh token error', err);
    }
  }

    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Request Timeout: The server is taking too long to respond.');
      timeoutErr.cause = err;
      throw timeoutErr;
    }
    throw err;
  }
};

export default API_URL;
