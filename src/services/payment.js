const PAYMENT_METHODS = {
  card: 'Tarjeta de crédito o débito',
  mercadopago: 'Mercado Pago',
  transfer: 'Transferencia bancaria'
};

function parsePayment(body, options = {}) {
  const method = String(body.payment_method || '').trim();
  if (!PAYMENT_METHODS[method]) {
    return { error: 'Elegí una forma de pago para finalizar.' };
  }

  if (method === 'card') {
    const holder = String(body.card_holder || '').trim();
    const number = String(body.card_number || '').replace(/\s+/g, '');
    if (options.requireDetails && (holder.length < 3 || number.length < 13)) {
      return { error: 'Completá el titular y el número de tarjeta.' };
    }
    return {
      payment: {
        method,
        label: PAYMENT_METHODS[method],
        last4: /^\d{4,}$/.test(number) ? number.slice(-4) : '',
        holder: holder || 'RendiYa',
        test: true
      }
    };
  }

  return {
    payment: {
      method,
      label: PAYMENT_METHODS[method],
      test: true
    }
  };
}

module.exports = { PAYMENT_METHODS, parsePayment };
