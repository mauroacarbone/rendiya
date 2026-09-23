import { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { IconCard, IconCar, IconCart, IconFolder, IconGrid, IconHome, IconInbox, IconUsers } from './Icons.jsx';
import { SITE_URL } from '../config';

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconGrid, end: true },
  { to: '/vehiculos', label: 'Vehículos', icon: IconCar },
  { to: '/usuarios', label: 'Usuarios', icon: IconUsers },
  { to: '/categorias', label: 'Categorías', icon: IconFolder },
  { to: '/leads', label: 'Leads B2B', icon: IconInbox },
  { to: '/pago', label: 'Simulador de Pago', icon: IconCard }
];

export default function Layout() {
  const { count } = useCart();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const outletContext = useMemo(() => ({ query }), [query]);

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <a className="logo" href={SITE_URL}>Rendi<span>Ya</span></a>
        <nav>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
              >
                <span className="nav-ico"><Icon /></span>
                {item.label}
              </NavLink>
            );
          })}
          <a className="back-home" href={SITE_URL}>
            <span className="nav-ico"><IconHome /></span>
            Volver al sitio
          </a>
        </nav>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button className="menu-btn" type="button" onClick={() => setMenuOpen((open) => !open)}>
            Menú
          </button>
          <label className="search">
            <span className="sr-only">Buscar</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar..."
            />
          </label>
          <div className="top-actions">
            <div className="profile">
              <span>Mauro Carbone</span>
              <img className="avatar" src="/images/favicon.png" alt="" />
            </div>
            <a className="home-chip" href={SITE_URL}>Volver al sitio</a>
            <NavLink to="/pago" className="cart-badge">
              <IconCart />
              Carrito: {count}
            </NavLink>
          </div>
        </header>
        <Outlet context={outletContext} />
      </div>
    </div>
  );
}
