const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = /^https?:\/\//i.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`;

export default API_URL;
