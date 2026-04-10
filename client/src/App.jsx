import { useState } from 'react';
import { CartProvider } from './CartContext';
import Header from './components/Header';
import PerfumeCatalog from './components/PerfumeCatalog';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import OperatorGuard from './components/OperatorGuard';

export default function App() {
  const [view, setView] = useState('catalog'); // 'catalog' | 'admin'
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <CartProvider>
      <div className="app">
        <Header
          view={view}
          setView={setView}
          cartOpen={cartOpen}
          setCartOpen={setCartOpen}
        />
        <main className="main-content">
          {view === 'catalog' && <PerfumeCatalog />}
          {view === 'admin' && <OperatorGuard><AdminPanel /></OperatorGuard>}
        </main>
        <Cart open={cartOpen} onClose={() => setCartOpen(false)} />
        {cartOpen && <div className="cart-overlay" onClick={() => setCartOpen(false)} />}
      </div>
    </CartProvider>
  );
}
