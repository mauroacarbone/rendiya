import { useState } from 'react';
import Swal from 'sweetalert2';
import { useCart } from '../context/CartContext';

const EMPTY_FORM = {
  holderName: 'Mauro Carbone',
  cardNumber: '',
  cvv: ''
};

export default function PaymentPanel() {
  const { clearCart } = useCart();
  const [form, setForm] = useState(EMPTY_FORM);
  const [processing, setProcessing] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    clearCart();
    setForm(EMPTY_FORM);
    setProcessing(false);

    await Swal.fire({
      icon: 'success',
      title: 'Compra finalizada!',
      text: 'El pago de prueba se procesó correctamente. El carrito ha sido vaciado.',
      confirmButtonText: 'Entendido',
      background: '#151b2b',
      color: '#f4f7ff',
      iconColor: '#34d399',
      confirmButtonColor: '#34d399',
      customClass: {
        popup: 'swal-glass'
      }
    });
  }

  return (
    <article className="glass pay-card">
      <h2>Simulación de Pago</h2>
      <form className="pay-form" onSubmit={handleSubmit}>
        <label>
          Titular
          <input
            name="holderName"
            value={form.holderName}
            onChange={updateField}
            required
            autoComplete="off"
          />
        </label>
        <label>
          Tarjeta
          <div className="card-field">
            <input
              name="cardNumber"
              value={form.cardNumber}
              onChange={updateField}
              inputMode="numeric"
              placeholder="**** **** ****"
              minLength={13}
              maxLength={19}
              required
              autoComplete="off"
            />
            <span className="card-brands" aria-hidden="true">●●</span>
          </div>
        </label>
        <label>
          CVV
          <input
            name="cvv"
            value={form.cvv}
            onChange={updateField}
            inputMode="numeric"
            placeholder="CVV"
            minLength={3}
            maxLength={4}
            required
            autoComplete="off"
          />
        </label>
        <p className="warn">* Entorno de prueba - No ingresar datos reales</p>
        <button className="btn-pay" type="submit" disabled={processing}>
          {processing ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </article>
  );
}
