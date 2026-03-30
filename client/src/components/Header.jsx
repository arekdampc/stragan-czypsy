import { useCart } from '../CartContext';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header({ view, setView, cartOpen, setCartOpen }) {
  const { items } = useCart();
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <header className="header">
      <span className="header-logo" onClick={() => setView('catalog')}>
        STRAGAN CZYPSY
      </span>
      <nav className="header-nav">
        <ThemeSwitcher />
        <button
          className={`nav-btn ${view === 'catalog' ? 'active' : ''}`}
          onClick={() => setView('catalog')}
        >
          Sklep
        </button>
        <button
          className={`nav-btn ${view === 'admin' ? 'active' : ''}`}
          onClick={() => setView('admin')}
        >
          Operator
        </button>
        <button className="cart-btn" onClick={() => setCartOpen(true)}>
          Koszyk
          {totalQty > 0 && <span className="cart-badge">{totalQty}</span>}
        </button>
      </nav>
    </header>
  );
}
