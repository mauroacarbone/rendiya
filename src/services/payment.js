const PAYMENT_METHODS = {
  card: 'Tarjeta de crédito o débito',
  mercadopago: 'Mercado Pago',
  transfer: 'Transferencia bancaria'
};

function parsePayment(body) {
  const method = String(body.payment_method || '').trim();
  if (!PAYMENT_METHODS[method]) {
    return { error: 'Elegí una forma de pago para finalizar.' };
  }

  if (method === 'card') {
    const holder = String(body.card_holder || '').trim() || 'RendiYa';
    const number = String(body.card_number || '').replace(/\s+/g, '');
    return {
      payment: {
        method,
        label: PAYMENT_METHODS[method] + ' (demostración)',
        last4: /^\d{4,}$/.test(number) ? number.slice(-4) : '0000',
        holder,
        test: true
      }
    };
  }

  return {
    payment: {
      method,
      label: PAYMENT_METHODS[method] + ' (demostración)',
      test: true
    }
  };
}

module.exports = { PAYMENT_METHODS, parsePayment };
