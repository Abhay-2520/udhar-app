const envUrl = (import.meta.env.VITE_API_URL || '').trim();
const normalizedBase = envUrl
  ? envUrl.replace(/\/$/, '')
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
const API_URL = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`;

export function getToken() {
  return localStorage.getItem('udhar_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('udhar_token', token);
  else localStorage.removeItem('udhar_token');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const normalizedPath = path.replace(/^\/api/, '');
  const requestUrl = `${API_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;

  const response = await fetch(requestUrl, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
