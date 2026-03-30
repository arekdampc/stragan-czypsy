import { useState, useEffect, useRef } from 'react';
import { useCart } from '../CartContext';

export default function MessageModal({ open, onClose }) {
  const { items, totalPerfume, totalGlass, total } = useCart();
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  function buildMessage() {
    const lines = items.map(item => {
      const lineTotal = (item.price * item.qty).toFixed(2);
      const perfumePart = (item.perfumePrice * item.qty).toFixed(2);
      const glassPart = (item.glassFee * item.qty).toFixed(2);
      const qtyLabel = item.qty > 1 ? ` ×${item.qty}` : '';
      return `• ${item.brand} ${item.name} – ${item.ml} ml${qtyLabel} – ${lineTotal} zł (${perfumePart} zł + ${glassPart} zł szkło)`;
    });

    return [
      'Cześć Czypsy,',
      'chciałbym odlewki:',
      '',
      ...lines,
      '',
      `Perfumy: ${totalPerfume.toFixed(2)} zł`,
      `Szkło (${items.reduce((s, i) => s + i.qty, 0)} szt. × 3 zł): ${totalGlass.toFixed(2)} zł`,
      `Razem: ${total.toFixed(2)} zł`,
    ].join('\n');
  }

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setMessage(buildMessage());
      setCopied(false);
    }
  }, [open, items]);

  // Auto-select text on open
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.select(), 50);
    }
  }, [open]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      textareaRef.current?.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Wiadomość do wysłania</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-hint">
            Skopiuj wiadomość i wyślij ją do sprzedawcy (np. przez WhatsApp, SMS lub e-mail).
          </p>
          <textarea
            ref={textareaRef}
            className="message-textarea"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={Math.min(20, message.split('\n').length + 3)}
            spellCheck={false}
          />
        </div>

        <div className="modal-footer">
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? '✓ Skopiowano!' : '📋 Kopiuj wiadomość'}
          </button>
          <button className="modal-close-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
