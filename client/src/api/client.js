const rawBase = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawBase.replace(/\/+$/, '');

const resolveUrl = (endpoint) => {
  if (!endpoint) return API_BASE;
  let clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (API_BASE.endsWith('/api') && clean.startsWith('/api')) {
    clean = clean.slice(4);
  }
  return `${API_BASE}${clean}`;
};

const getHeaders = (isFormData = false) => {
  const token = localStorage.getItem('attendtrack_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const handleResponse = async (res) => {
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = { message: 'Failed to parse JSON response from server' };
    }
  } else {
    const text = await res.text();
    data = { message: text || `Server error (${res.status} ${res.statusText})` };
  }

  if (!res.ok) {
    const error = new Error(data.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const api = {
  get: async (endpoint) => {
    try {
      const res = await fetch(resolveUrl(endpoint), {
        method: 'GET',
        headers: getHeaders()
      });
      return await handleResponse(res);
    } catch (err) {
      if (!err.status && err.name === 'TypeError') {
        err.message = 'Unable to connect to server. Please ensure the backend is running.';
      }
      throw err;
    }
  },

  post: async (endpoint, body) => {
    try {
      const res = await fetch(resolveUrl(endpoint), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      return await handleResponse(res);
    } catch (err) {
      if (!err.status && err.name === 'TypeError') {
        err.message = 'Unable to connect to server. Please ensure the backend is running.';
      }
      throw err;
    }
  },

  postForm: async (endpoint, formData) => {
    try {
      const res = await fetch(resolveUrl(endpoint), {
        method: 'POST',
        headers: getHeaders(true),
        body: formData
      });
      return await handleResponse(res);
    } catch (err) {
      if (!err.status && err.name === 'TypeError') {
        err.message = 'Unable to connect to server. Please ensure the backend is running.';
      }
      throw err;
    }
  },

  put: async (endpoint, body) => {
    try {
      const res = await fetch(resolveUrl(endpoint), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      return await handleResponse(res);
    } catch (err) {
      if (!err.status && err.name === 'TypeError') {
        err.message = 'Unable to connect to server. Please ensure the backend is running.';
      }
      throw err;
    }
  },

  delete: async (endpoint) => {
    try {
      const res = await fetch(resolveUrl(endpoint), {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleResponse(res);
    } catch (err) {
      if (!err.status && err.name === 'TypeError') {
        err.message = 'Unable to connect to server. Please ensure the backend is running.';
      }
      throw err;
    }
  }
};

