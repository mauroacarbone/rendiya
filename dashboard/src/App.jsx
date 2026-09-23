import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import VehiclesPage from './pages/VehiclesPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/vehiculos" element={<VehiclesPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/pago" element={<CheckoutPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
