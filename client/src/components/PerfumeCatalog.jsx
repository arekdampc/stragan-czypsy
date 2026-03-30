import { useState, useEffect } from 'react';
import PerfumeCard from './PerfumeCard';
import PerfumeRow from './PerfumeRow';

const TYPE_FILTERS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'męskie', label: 'Męskie' },
  { value: 'damskie', label: 'Damskie' },
  { value: 'unisex', label: 'Unisex' }
];

const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
);

const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="2" width="14" height="2.5" rx="1"/>
    <rect x="1" y="6.75" width="14" height="2.5" rx="1"/>
    <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
  </svg>
);

export default function PerfumeCatalog() {
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState(() =>
    localStorage.getItem('viewMode') || 'grid'
  );

  function setView(mode) {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  }

  useEffect(() => {
    fetch('/api/perfumes')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPerfumes(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = perfumes.filter(p => {
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  if (loading) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      Ładowanie kolekcji...
    </div>
  );

  if (error) return <div className="error-state">Błąd: {error}</div>;

  return (
    <div>
      <h1 className="page-title">Kolekcja Perfum</h1>
      <p className="page-subtitle">{perfumes.length} zapachów dostępnych do odlania</p>

      <div className="filters">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            className={`filter-btn ${typeFilter === f.value ? 'active' : ''}`}
            onClick={() => setTypeFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          className="search-input"
          placeholder="Szukaj zapachu lub marki..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
            title="Widok siatki"
          >
            <IconGrid />
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
            title="Widok listy"
          >
            <IconList />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-catalog">Brak wyników dla wybranych filtrów.</div>
      ) : viewMode === 'grid' ? (
        <div className="catalog-grid">
          {filtered.map(p => <PerfumeCard key={p.id} perfume={p} />)}
        </div>
      ) : (
        <div className="catalog-list">
          {filtered.map(p => <PerfumeRow key={p.id} perfume={p} />)}
        </div>
      )}
    </div>
  );
}
