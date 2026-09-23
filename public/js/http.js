(function (root) {
  var LOGIN_PATH = '/users/login';

  function toast(message) {
    var el = document.getElementById('rendiya-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rendiya-toast';
      el.className = 'rendiya-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
    el.classList.add('is-on');
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () {
      el.classList.remove('is-on');
    }, 4500);
  }

  function HttpError(message, status, kind) {
    var error = new Error(message);
    error.name = 'HttpError';
    error.status = status;
    error.kind = kind;
    return error;
  }

  function loginUrl() {
    var here = window.location.pathname + window.location.search;
    return LOGIN_PATH + '?expired=1&next=' + encodeURIComponent(here);
  }

  function redirectToLogin() {
    if (redirectToLogin.started) return;
    redirectToLogin.started = true;
    toast('Tu sesión expiró. Te llevamos a ingresar de nuevo…');
    window.setTimeout(function () {
      window.location.href = loginUrl();
    }, 900);
  }

  /**
   * fetch unificado. Agrega Accept de datos y, si el servidor devuelve HTML
   * (sesión vencida que siguió el 302, o una ruta que renderizó una vista),
   * no deja que ese HTML llegue a la interfaz.
   */
  async function safeFetch(url, options) {
    var opts = Object.assign({ credentials: 'same-origin' }, options || {});
    opts.headers = Object.assign({
      Accept: 'application/json, application/pdf'
    }, opts.headers || {});

    var response;
    try {
      response = await fetch(url, opts);
    } catch (error) {
      console.error('[http] Error de red en ' + url, error);
      throw HttpError('No hay conexión con el servidor. Revisá tu red e intentá de nuevo.', 0, 'network');
    }

    if (response.status === 401) {
      redirectToLogin();
      throw HttpError('Debes iniciar sesión para realizar una reserva.', 401, 'session');
    }

    var contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('text/html') !== -1) {
      var onLogin = response.url && response.url.indexOf('/login') !== -1;
      if (onLogin) {
        redirectToLogin();
        throw HttpError('Tu sesión expiró. Volvé a ingresar.', 401, 'session');
      }
      console.error('[http] HTML inesperado de ' + (response.url || url) + ' (' + response.status + ')');
      throw HttpError('El servidor respondió con una página web en lugar de datos (' + response.status + ').', response.status, 'invalid');
    }

    return response;
  }

  async function messageFromResponse(response) {
    var type = (response.headers.get('content-type') || '').toLowerCase();
    if (type.indexOf('text/html') !== -1) {
      return 'El servidor respondió con una página web en lugar de datos (' + response.status + ').';
    }
    if (type.indexOf('application/json') !== -1) {
      var body = await response.json().catch(function () { return {}; });
      var message = body && (body.error || body.message);
      if (typeof message === 'string' && message && message.indexOf('<') === -1) {
        return message;
      }
    }
    return 'Error ' + response.status + ' del servidor.';
  }

  async function fetchJson(url, options) {
    var response = await safeFetch(url, options);
    if (!response.ok) {
      var message = await messageFromResponse(response);
      console.error('[http] ' + response.url + ' respondió ' + response.status);
      throw HttpError(message, response.status, response.status === 403 ? 'forbidden' : 'server');
    }
    return response.json();
  }

  function fetchBlob(url, expectedType, options) {
    var headers = Object.assign({ Accept: expectedType || 'application/pdf' }, (options && options.headers) || {});
    return safeFetch(url, Object.assign({}, options || {}, { headers: headers })).then(async function (response) {
      if (!response.ok) {
        throw HttpError(await messageFromResponse(response), response.status, 'server');
      }
      var type = (response.headers.get('content-type') || '').toLowerCase();
      if (expectedType && type.indexOf(expectedType) === -1) {
        throw HttpError('Respuesta no válida del servidor (' + response.status + ').', response.status, 'invalid');
      }
      return response.blob();
    });
  }

  function visibleMessage(error, fallbackMessage) {
    var message = error && error.message;
    if (!message || /<!doctype|<html|<\/?[a-z][\s\S]*>/i.test(message)) {
      return fallbackMessage || 'Ocurrió un error. Intentá de nuevo.';
    }
    return message;
  }

  function handleError(error, fallbackMessage) {
    if (error && error.kind === 'session') {
      redirectToLogin();
      return;
    }
    toast(visibleMessage(error, fallbackMessage));
  }

  var http = {
    safeFetch: safeFetch,
    request: safeFetch,
    toast: toast,
    fetchJson: fetchJson,
    fetchBlob: fetchBlob,
    handleError: handleError,
    redirectToLogin: redirectToLogin,
    HttpError: HttpError
  };

  root.http = http;
  root.safeFetch = safeFetch;
  root.RendiYaHttp = http;
})(window);
