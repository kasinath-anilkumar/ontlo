const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// In production, ensure we use https if the URL is provided without a protocol
export const API_URL = rawApiUrl.startsWith('http') 
  ? rawApiUrl 
  : `https://${rawApiUrl}`;

console.log(`[API] Target: ${API_URL}`);

const pendingRequests = new Map();

export const apiFetch = async (url, options = {}) => {
  // 1. Deduplicate concurrent identical requests
  const requestKey = `${options.method || 'GET'}:${url}`;
  if (pendingRequests.has(requestKey)) {
    const response = await pendingRequests.get(requestKey);
    return response.clone();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); 

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
        // ... (Token refresh logic remains same)
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        // Return a dummy response for aborted requests to avoid throwing up the stack
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
