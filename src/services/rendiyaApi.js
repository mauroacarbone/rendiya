const API_BASE = (process.env.RENDIYA_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const COLD_START_MESSAGE = 'El servicio de reservas se está despertando. Recargá en unos segundos.';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status, error) {
  if (status === 502 || status === 503 || status === 504 || status === 524) {
    return true;
  }
  const message = String((error && error.message) || error || '').toLowerCase();
  return (
    message.includes('fetch failed')
    || message.includes('timeout')
    || message.includes('aborted')
    || message.includes('econnreset')
    || message.includes('enotfound')
    || message.includes('network')
  );
}

function coldStartError(cause) {
  const error = new Error(COLD_START_MESSAGE);
  error.status = 503;
  error.cause = cause;
  error.coldStart = true;
  return error;
}

async function apiRequest(path, { method = 'GET', token, body, headers: extraHeaders } = {}) {
  const headers = { Accept: 'application/json', ...extraHeaders };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20000)
      });
      const payload = await response.json().catch(() => ({}));
      if (isRetryable(response.status) && attempt < 4) {
        lastError = new Error(payload.message || `HTTP ${response.status}`);
        await sleep(3000 * attempt);
        continue;
      }
      if (!response.ok || payload.success === false) {
        const error = new Error(payload.message || 'Error al hablar con la API de reservas');
        error.status = response.status;
        throw error;
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (error.status && !isRetryable(error.status, error)) {
        throw error;
      }
      if (attempt < 4) {
        await sleep(3000 * attempt);
      }
    }
  }

  if (isRetryable(lastError && lastError.status, lastError)) {
    throw coldStartError(lastError);
  }
  throw lastError || coldStartError();
}

async function issueStorefrontToken(session) {
  if (!session.user || !session.user.email) {
    return null;
  }

  const payload = await apiRequest('/api/auth/storefront', {
    method: 'POST',
    headers: { 'X-Storefront-Key': process.env.STOREFRONT_SECRET || 'rendiya-storefront-dev' },
    body: {
      email: session.user.email,
      name: `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email,
      role: String(session.user.category).toLowerCase() === 'admin' ? 'admin' : 'user',
      phone: session.user.phone || undefined
    }
  });

  session.apiToken = payload.data.token;
  return session.apiToken;
}

async function ensureApiToken(session) {
  if (session.apiToken) {
    return session.apiToken;
  }
  return issueStorefrontToken(session);
}

async function withApiToken(session, run) {
  let token = await ensureApiToken(session);
  try {
    return await run(token);
  } catch (error) {
    if (error.status === 401) {
      session.apiToken = null;
      token = await issueStorefrontToken(session);
      return run(token);
    }
    throw error;
  }
}

async function syncApiSession(email, password, name, phone) {
  try {
    const login = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    return login.data.token;
  } catch (error) {
    if (error.coldStart) {
      throw error;
    }
    if (error.status !== 401 || !name) {
      throw error;
    }
  }

  try {
    const registered = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name, email, password, phone }
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

async function syncStorefrontUser(session) {
  if (!session || !session.user || !session.user.email) {
    return session && session.apiToken ? session.apiToken : null;
  }
  try {
    return await issueStorefrontToken(session);
  } catch (error) {
    return session.apiToken || null;
  }
}

async function createReservation(token, { date, time_slot, status, venue_slug, addons, amount }) {
  return apiRequest('/api/reservations', {
    method: 'POST',
    token,
    body: { date, time_slot, status, venue_slug, addons, amount }
  });
}

async function listVenuesFromApi() {
  const payload = await apiRequest('/api/venues');
  return Array.isArray(payload.data) ? payload.data : [];
}

async function venueAvailability(slug, date) {
  const payload = await apiRequest(
    `/api/venues/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}`
  );
  return payload.data;
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

async function notifyPaymentApproved(reservationId) {
  const storefrontSecret = process.env.STOREFRONT_SECRET || 'rendiya-storefront-dev';
  const webhookSecret = process.env.WEBHOOK_SECRET || storefrontSecret;
  return apiRequest('/api/webhooks/payments', {
    method: 'POST',
    body: {
      action: 'payment.created',
      status: 'approved',
      reservation_id: reservationId,
      external_reference: String(reservationId)
    },
    headers: {
      'x-storefront-key': storefrontSecret,
      'x-webhook-secret': webhookSecret
    }
  });
}

module.exports = {
  API_BASE,
  COLD_START_MESSAGE,
  ensureApiToken,
  withApiToken,
  syncApiSession,
  syncStorefrontUser,
  createReservation,
  listReservations,
  updateReservation,
  notifyPaymentApproved,
  listVenuesFromApi,
  venueAvailability
};
