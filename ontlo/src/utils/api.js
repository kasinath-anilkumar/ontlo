const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_URL = /^https?:\/\//i.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`;

export const apiFetch = async (url, options = {}) => {
  const config = {
    ...options,
    credentials: 'include', // Important for HTTP-only cookies
    headers: {
      ...options.headers,
    }
  };

  let response = await fetch(url, config);

  // If unauthorized, try to refresh token
  if (response.status === 401 && !url.includes('/login') && !url.includes('/register') && !url.includes('/setup')) {
    try {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include'
      });

      if (refreshRes.ok) {
        // Retry original request
        response = await fetch(url, config);
      } else {
        // Refresh failed, clear user state
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-expired'));
      }
    } catch (err) {
      console.error('Refresh token error', err);
    }
  }

  return response;
};

export default API_URL;
