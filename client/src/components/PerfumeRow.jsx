import { useState } from 'react';
import { useCart, GLASS_FEE } from '../CartContext';

const ML_PRESETS = [5, 10, 15, 20];
const MIN_ML = 5;

const TYPE_BADGE = {
  'męskie':  ['badge-meskie',  'Męskie'],
  'damskie': ['badge-damskie', 'Damskie'],
  'unisex':  ['badge-unisex',  'Unisex'],
};

let toastTimeout;
function showToast(msg) {
  let el = document.getElementById('global-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 2200);
}

export default function PerfumeRow({ perfume }) {
  const { addItem } = useCart();
  const maxMl = perfume.availableMl;
  const availablePresets = ML_PRESETS.filter(ml => maxMl === null || ml <= maxMl);

  const [selectedPreset, setSelectedPreset] = useState(availablePresets[0] ?? null);
  const [customMl, setCustomMl] = useState('');
  const [customError, setCustomError] = useState('');

  const isCustomMode = customMl !== '';
  const effectiveMl  = isCustomMode ? parseFloat(customMl) : selectedPreset;
  const isValid      = effectiveMl >= MIN_ML && (maxMl === null || effectiveMl <= maxMl);

  const perfumePrice = (effectiveMl && isValid) ? perfume.pricePerMl * effectiveMl : null;
  const totalPrice   = perfumePrice !== null ? (perfumePrice + GLASS_FEE).toFixed(2) : null;

  const [badgeClass, badgeLabel] = TYPE_BADGE[perfume.type] || ['badge-unisex', 'Unisex'];

  function handlePresetClick(ml) {
    setSelectedPreset(ml);
    setCustomMl('');
    setCustomError('');
  }

  function handleCustomChange(e) {
    const val = e.target.value;
    setCustomMl(val);
    setSelectedPreset(null);
    setCustomError('');
    if (val === '') return;
    const num = parseFloat(val);
    if (isNaN(num) || num < MIN_ML) setCustomError(`min. ${MIN_ML} ml`);
    else if (maxMl !== null && num > maxMl) setCustomError(`maks. ${maxMl} ml`);
  }

  function handleAdd() {
    if (!effectiveMl || !isValid || customError) return;
    const ml = Math.round(effectiveMl * 10) / 10;
    addItem(perfume, ml);
    showToast(`${perfume.name} ${ml} ml dodano do koszyka`);
  }

  return (
    <div className="perfume-row">
      {/* Nazwa + badge */}
      <div className="row-info">
        <span className="row-brand">{perfume.brand}</span>
        <span className="row-name">{perfume.name}</span>
        <span className={`card-type-badge ${badgeClass}`}>{badgeLabel}</span>
      </div>

      {/* Cena za ml */}
      <div className="row-price-ml">
        <strong>{perfume.pricePerMl.toFixed(2)} zł</strong>
        <span>/ml</span>
      </div>

      {/* Dostępne ml */}
      <div className="row-available">
        {maxMl ? `${maxMl} ml` : '—'}
      </div>

      {/* Selektor ml */}
      <div className="row-selector">
        <div className="ml-selector">
          {availablePresets.map(ml => (
            <button
              key={ml}
              className={`ml-btn ${!isCustomMode && selectedPreset === ml ? 'selected' : ''}`}
              onClick={() => handlePresetClick(ml)}
            >
              {ml} ml
            </button>
          ))}
        </div>
        <div className="custom-ml-input-wrap" style={{ marginTop: '0.3rem' }}>
          <input
            type="number"
            className={`custom-ml-input ${customError ? 'input-error' : ''} ${isCustomMode && !customError ? 'input-ok' : ''}`}
            placeholder={`min. ${MIN_ML}`}
            min={MIN_ML}
            max={maxMl ?? undefined}
            step="0.5"
            value={customMl}
            onChange={handleCustomChange}
          />
          <span className="custom-ml-unit">ml</span>
        </div>
        {customError && <span className="custom-ml-error">{customError}</span>}
      </div>

      {/* Cena końcowa + przycisk */}
      <div className="row-action">
        <div className="price-breakdown" style={{ alignItems: 'flex-end' }}>
          {totalPrice ? (
            <>
              <span className="price-total">{totalPrice} zł</span>
              <span className="price-detail">{perfumePrice.toFixed(2)} + {GLASS_FEE} zł szkło</span>
            </>
          ) : <span className="price-total">—</span>}
        </div>
        <button
          className="add-to-cart-btn"
          onClick={handleAdd}
          disabled={!effectiveMl || !isValid || !!customError}
        >
          Do koszyka
        </button>
      </div>
    </div>
  );
}
