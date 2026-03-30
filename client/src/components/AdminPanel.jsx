import { useState, useEffect } from 'react';

export default function AdminPanel() {
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState({});
  const [bulkStatus, setBulkStatus] = useState(null); // null | 'loading' | { ok, skipped, errors }

  useEffect(() => {
    fetch('/api/perfumes')
      .then(r => r.json())
      .then(data => setPerfumes(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(id, file) {
    if (!file) return;
    setStatuses(s => ({ ...s, [id]: { msg: 'Wysyłanie...', type: '' } }));
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(`/api/perfumes/${id}/image`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd');
      setPerfumes(prev => prev.map(p => p.id === id ? { ...p, image: data.imageUrl } : p));
      setStatuses(s => ({ ...s, [id]: { msg: '✓ Zapisano', type: 'success' } }));
    } catch (err) {
      setStatuses(s => ({ ...s, [id]: { msg: err.message, type: 'error' } }));
    }
  }

  async function handleFetchFromFragrantica(id, name) {
    setStatuses(s => ({ ...s, [id]: { msg: '⏳ Pobieranie z Fragrantica...', type: '' } }));
    try {
      const res = await fetch(`/api/perfumes/${id}/fetch-image`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd');
      setPerfumes(prev => prev.map(p => p.id === id ? { ...p, image: data.imageUrl } : p));
      setStatuses(s => ({ ...s, [id]: { msg: '✓ Pobrano z Fragrantica', type: 'success' } }));
    } catch (err) {
      setStatuses(s => ({ ...s, [id]: { msg: `✗ ${err.message}`, type: 'error' } }));
    }
  }

  async function handleDelete(id) {
    setStatuses(s => ({ ...s, [id]: { msg: 'Usuwanie...', type: '' } }));
    try {
      await fetch(`/api/perfumes/${id}/image`, { method: 'DELETE' });
      setPerfumes(prev => prev.map(p => p.id === id ? { ...p, image: null } : p));
      setStatuses(s => ({ ...s, [id]: { msg: '✓ Usunięto', type: 'success' } }));
    } catch {
      setStatuses(s => ({ ...s, [id]: { msg: '✗ Błąd usuwania', type: 'error' } }));
    }
  }

  async function handleFetchAll(force = false) {
    setBulkStatus('loading');
    try {
      const res = await fetch('/api/fetch-all-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh perfume list to show new images
      const perfRes = await fetch('/api/perfumes');
      const perfData = await perfRes.json();
      setPerfumes(perfData);
      setBulkStatus(data);
    } catch (err) {
      setBulkStatus({ error: err.message });
    }
  }

  if (loading) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      Ładowanie...
    </div>
  );

  const withImage = perfumes.filter(p => p.image).length;

  return (
    <div className="admin-panel">
      <h1 className="page-title">Panel Operatora</h1>
      <p className="page-subtitle">Zarządzaj zdjęciami perfum · {withImage}/{perfumes.length} ma zdjęcia</p>

      {/* Bulk fetch bar */}
      <div className="bulk-fetch-bar">
        <div>
          <p className="bulk-fetch-title">Pobierz zdjęcia z Fragrantica</p>
          <p className="bulk-fetch-sub">Automatycznie pobiera zdjęcia dla perfum bez zdjęć ze strony Fragrantica</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button
            className="bulk-btn"
            onClick={() => handleFetchAll(false)}
            disabled={bulkStatus === 'loading'}
          >
            {bulkStatus === 'loading' ? '⏳ Pobieranie...' : '↓ Pobierz brakujące'}
          </button>
          <button
            className="bulk-btn bulk-btn-outline"
            onClick={() => handleFetchAll(true)}
            disabled={bulkStatus === 'loading'}
            title="Nadpisuje istniejące zdjęcia"
          >
            ↺ Odśwież wszystkie
          </button>
        </div>
      </div>

      {/* Bulk status */}
      {bulkStatus && bulkStatus !== 'loading' && (
        <div className={`bulk-result ${bulkStatus.error ? 'error' : 'success'}`}>
          {bulkStatus.error
            ? `✗ Błąd: ${bulkStatus.error}`
            : `✓ Pobrano: ${bulkStatus.ok} · Pominięto: ${bulkStatus.skipped} · Błędy: ${bulkStatus.errors}`
          }
        </div>
      )}

      <div className="admin-grid">
        {perfumes.map(p => (
          <div key={p.id} className="admin-card">
            <div className="admin-card-header">
              <p className="admin-card-brand">{p.brand}</p>
              <p className="admin-card-name">{p.name}</p>
            </div>
            <div className="admin-img-preview">
              {p.image
                ? <img src={p.image} alt={p.fullName} />
                : '📷'
              }
            </div>
            <div className="admin-card-actions">
              <button
                className="fetch-fragrantica-btn"
                onClick={() => handleFetchFromFragrantica(p.id, p.fullName)}
                title="Pobierz zdjęcie z Fragrantica"
              >
                ↓ Fragrantica
              </button>
              <label className="upload-label" title="Wgraj własne zdjęcie">
                ↑ Własne
                <input
                  type="file"
                  accept="image/*"
                  className="upload-input"
                  onChange={e => handleUpload(p.id, e.target.files[0])}
                />
              </label>
              {p.image && (
                <button className="delete-img-btn" onClick={() => handleDelete(p.id)}>✕</button>
              )}
            </div>
            {statuses[p.id] && (
              <p className={`upload-status ${statuses[p.id].type}`}>
                {statuses[p.id].msg}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
