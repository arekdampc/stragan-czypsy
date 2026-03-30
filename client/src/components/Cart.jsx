import { useState } from 'react';
import { useCart } from '../CartContext';
import MessageModal from './MessageModal';

export default function Cart({ open, onClose }) {
  const { items, removeItem, updateQty, clearCart, total, totalPerfume, totalGlass } = useCart();
  const [msgOpen, setMsgOpen] = useState(false);

  return (
    <>
    <aside className={`cart-sidebar ${open ? 'open' : ''}`}>
      <div className="cart-header">
        <h2 className="cart-title">Koszyk</h2>
        <button className="close-btn" onClick={onClose} aria-label="Zamknij">✕</button>
      </div>

      <div className="cart-items">
        {items.length === 0 ? (
          <div className="cart-empty">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛒</div>
            Twój koszyk jest pusty
          </div>
        ) : (
          items.map(item => (
            <div key={item.key} className="cart-item">
              <div className="cart-item-img">
                {item.image
                  ? <img src={item.image} alt={item.fullName} />
                  : '🌸'
                }
              </div>
              <div className="cart-item-info">
                <p className="cart-item-brand">{item.brand}</p>
                <p className="cart-item-name">{item.name}</p>
                <p className="cart-item-meta">
                  {item.ml} ml · {item.pricePerMl.toFixed(2)} zł/ml
                </p>
                <p className="cart-item-glass-fee">
                  + {item.glassFee} zł szkło
                </p>
                <div className="cart-item-controls">
                  <button className="qty-btn" onClick={() => updateQty(item.key, -1)}>−</button>
                  <span className="qty-value">{item.qty}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.key, +1)}>+</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <p className="cart-item-price">{(item.price * item.qty).toFixed(2)} zł</p>
                {item.qty > 1 && (
                  <p className="cart-item-unit-price">{item.price.toFixed(2)} zł / szt.</p>
                )}
                <button
                  className="remove-item-btn"
                  onClick={() => removeItem(item.key)}
                  title="Usuń"
                >✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="cart-footer">
          {/* Rozbicie kosztów */}
          <div className="cart-summary-breakdown">
            <div className="cart-summary-row">
              <span>Perfumy</span>
              <span>{totalPerfume.toFixed(2)} zł</span>
            </div>
            <div className="cart-summary-row cart-summary-glass">
              <span>Szkło ({items.reduce((s, i) => s + i.qty, 0)} szt. × 3 zł)</span>
              <span>{totalGlass.toFixed(2)} zł</span>
            </div>
          </div>

          <div className="cart-total-row">
            <span className="cart-total-label">Razem</span>
            <span className="cart-total-value">{total.toFixed(2)} zł</span>
          </div>

          <button className="generate-msg-btn" onClick={() => setMsgOpen(true)}>
            ✉ Wygeneruj wiadomość
          </button>
          <button className="clear-cart-btn" onClick={clearCart}>
            Wyczyść koszyk
          </button>
        </div>
      )}
    </aside>

    <MessageModal open={msgOpen} onClose={() => setMsgOpen(false)} />
    </>
  );
}
