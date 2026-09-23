const SESSION_EXPIRED = 'Sesión expirada. Por favor, iniciá sesión nuevamente.';

const VOUCHER_PATH = /^\/users\/reservations\/[^/]+\/voucher\/?$/;

/**
 * Pedidos que esperan datos (JSON o PDF), nunca una vista HTML:
 * `/api`, el voucher, XHR, y los `fetch` cuyo `Accept` pide JSON o PDF.
 * `fetch` sigue los 302, así que una redirección al login les llega como HTML 200.
 */
function wantsJson(req) {
  const url = req.originalUrl || req.url || '';
  const pathOnly = url.split('?')[0];
  if (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?')) return true;
  if (VOUCHER_PATH.test(pathOnly)) return true;
  if (req.xhr) return true;

  const accept = String((req.headers && req.headers.accept) || '');
  if (/application\/pdf/i.test(accept) && !/text\/html/i.test(accept)) return true;
  return req.accepts(['html', 'json']) === 'json';
}

module.exports = { wantsJson, SESSION_EXPIRED };
