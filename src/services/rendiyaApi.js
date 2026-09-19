const API_BASE = (process.env.RENDIYA_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function apiRequest(path, { method = 'GET', token, body, headers: extraHeaders } = {}) {
  const headers = { Accept: 'application/json', ...extraHeaders };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || 'Error al hablar con la API de reservas');
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function ensureApiToken(session) {
  if (session.apiToken) {
    return session.apiToken;
  }
  if (!session.user || !session.user.email) {
    return null;
  }

  const payload = await apiRequest('/api/auth/storefront', {
    method: 'POST',
    headers: { 'X-Storefront-Key': process.env.STOREFRONT_SECRET || 'rendiya-storefront-dev' },
    body: {
      email: session.user.email,
      name: `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email,
      role: String(session.user.category).toLowerCase() === 'admin' ? 'admin' : 'user'
    }
  });

  session.apiToken = payload.data.token;
  return session.apiToken;
}

async function syncApiSession(email, password, name) {
  try {
    const login = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    return login.data.token;
  } catch (error) {
    if (error.status !== 401 || !name) {
      throw error;
    }
  }

  try {
    const registered = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name, email, password }
    });
    return registered.data.token;
  } catch (error) {
    if (error.status === 409) {
      const login = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      return login.data.token;
    }
    throw error;
  }
}

async function createReservation(token, { date, time_slot, status }) {
  return apiRequest('/api/reservations', {
    method: 'POST',
    token,
    body: { date, time_slot, status }
  });
}

async function listReservations(token) {
  if (!token) {
    const error = new Error('No hay sesión de reservas. Volvé a iniciar sesión.');
    error.status = 401;
    throw error;
  }
  const payload = await apiRequest('/api/reservations', { token });
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data.reservations)) return data.reservations;
  return [];
}

async function updateReservation(token, id, data) {
  if (!token) {
    const error = new Error('No hay sesión de reservas. Volvé a iniciar sesión.');
    error.status = 401;
    throw error;
  }
  return apiRequest(`/api/reservations/${id}`, {
    method: 'PUT',
    token,
    body: data
  });
}

module.exports = {
  API_BASE,
  ensureApiToken,
  syncApiSession,
  createReservation,
  listReservations,
  updateReservation
};
