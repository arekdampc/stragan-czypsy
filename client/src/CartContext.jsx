import { createContext, useContext, useState } from 'react';

export const GLASS_FEE = 3; // zł za flakon

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  function addItem(perfume, ml) {
    const key = `${perfume.id}-${ml}`;
    const perfumePrice = parseFloat((perfume.pricePerMl * ml).toFixed(2));
    const unitPrice = parseFloat((perfumePrice + GLASS_FEE).toFixed(2));

    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        key,
        id: perfume.id,
        fullName: perfume.fullName,
        brand: perfume.brand,
        name: perfume.name,
        ml,
        pricePerMl: perfume.pricePerMl,
        perfumePrice,   // sama cena za ml (bez szkła)
        glassFee: GLASS_FEE,
        price: unitPrice, // cena końcowa = perfumePrice + glassFee
        image: perfume.image,
        qty: 1
      }];
    });
  }

  function removeItem(key) {
    setItems(prev => prev.filter(i => i.key !== key));
  }

  function updateQty(key, delta) {
    setItems(prev => prev
      .map(i => i.key === key ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalPerfume = items.reduce((sum, i) => sum + i.perfumePrice * i.qty, 0);
  const totalGlass   = items.reduce((sum, i) => sum + i.glassFee * i.qty, 0);
  const total        = totalPerfume + totalGlass;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, totalPerfume, totalGlass }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
