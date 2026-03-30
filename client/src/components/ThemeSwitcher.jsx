import { useState, useEffect, useRef } from 'react';

export const THEMES = [
  {
    id: 'zloto',
    name: 'Złoto',
    swatch: ['#1a1a1a', '#b8975a', '#faf8f5'],
  },
  {
    id: 'noir',
    name: 'Noir',
    swatch: ['#111111', '#c9a96e', '#1e1e1e'],
  },
  {
    id: 'mineral',
    name: 'Mineral',
    swatch: ['#1e2a3a', '#3d7ab5', '#f4f6f8'],
  },
  {
    id: 'blush',
    name: 'Blush',
    swatch: ['#2d1f24', '#c06e7a', '#fff5f7'],
  },
];

export function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem('theme', id);
}

export default function ThemeSwitcher() {
  const [active, setActive] = useState(
    () => localStorage.getItem('theme') || 'zloto'
  );
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { applyTheme(active); }, [active]);

  // Zamknij po kliknięciu poza komponentem
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function select(id) {
    setActive(id);
    setOpen(false);
  }

  const current = THEMES.find(t => t.id === active);

  return (
    <div className="theme-switcher" ref={ref}>
      <button
        className="theme-trigger"
        onClick={() => setOpen(o => !o)}
        title="Zmień motyw"
      >
        <span className="theme-trigger-swatches">
          {current.swatch.map((c, i) => (
            <span key={i} style={{ background: c }} className="mini-swatch" />
          ))}
        </span>
        <span className="theme-trigger-label">{current.name}</span>
        <span className="theme-trigger-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="theme-dropdown">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-option ${active === t.id ? 'active' : ''}`}
              onClick={() => select(t.id)}
            >
              <span className="theme-swatches">
                {t.swatch.map((c, i) => (
                  <span key={i} style={{ background: c }} className="swatch" />
                ))}
              </span>
              <span className="theme-name">{t.name}</span>
              {active === t.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
