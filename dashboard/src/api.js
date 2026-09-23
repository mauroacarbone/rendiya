import { API_BASE } from './config';

const SESSION_EXPIRED = 'Sesión expirada. Por favor, iniciá sesión nuevamente.';

function isJson(response) {
  return (response.headers.get('content-type') || '').includes('application/json');
}

function landedOnLogin(response) {
  return response.redirected && new URL(response.url, window.location.href).pathname === '/users/login';
}

async function describeInvalid(response, url) {
  const snippet = await response.text().catch(() => '');
  console.error(`[api] Respuesta no JSON de ${url} (${response.status})`, snippet.slice(0, 300));
  return `Respuesta no válida del servidor (${response.status})`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!isJson(response)) {
    throw new Error(await describeInvalid(response, url));
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Error ${response.status} al pedir ${url}`);
  }
  return response.json();
}

function toProxiedUrl(url) {
  if (!url) return url;
  return url.replace(/^https?:\/\/[^/]+/, '');
}

export async function fetchAllPages(resource, collectionKey) {
  const first = await fetchJson(`${API_BASE}/${resource}`);
  const items = [...(first[collectionKey] || [])];
  let next = first.next;

  while (next) {
    const page = await fetchJson(toProxiedUrl(next));
    items.push(...(page[collectionKey] || []));
    next = page.next;
  }

  return { ...first, [collectionKey]: items };
}

export function fetchResource(resource, id) {
  return fetchJson(`${API_BASE}/${resource}/${id}`);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function adminRequest(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    console.error(`[api] Error de red en ${method} ${path}`, error);
    throw new ApiError('No hay conexión con el servidor. Revisá tu red e intentá de nuevo.', 0);
  }
  if (response.status === 401 || landedOnLogin(response)) {
    throw new ApiError(SESSION_EXPIRED, 401);
  }
  if (!isJson(response)) {
    throw new ApiError(await describeInvalid(response, path), response.status);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`[api] ${method} ${path} respondió ${response.status}`, payload);
    const fallback = response.status === 401 || response.status === 403
      ? 'No tenés permisos de administrador. Volvé a iniciar sesión.'
      : `Error ${response.status}`;
    throw new ApiError(payload.error || fallback, response.status);
  }
  return payload;
}

export function fetchLeads() {
  return adminRequest('/admin/leads');
}

export function updateLeadStatus(id, status) {
  return adminRequest(`/admin/leads/${id}/status`, { method: 'PATCH', body: { status } });
}
