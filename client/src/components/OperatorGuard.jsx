import { useState, useEffect } from 'react';

const STORAGE_KEY = 'operator_auth';
const CORRECT_PASSWORD = import.meta.env.VITE_OPERATOR_PASSWORD || 'czypsy';

export default function OperatorGuard({ children }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (input === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1');
      setAuthed(true);
    } else {
      setError(true);
      setInput('');
    }
  }

  if (authed) return children;

  return (
    <div className="operator-guard">
      <form className="operator-guard-form" onSubmit={handleSubmit}>
        <div className="operator-guard-title">Panel operatora</div>
        <input
          className={`operator-guard-input ${error ? 'input-error' : ''}`}
          type="password"
          placeholder="Hasło"
          value={input}
          autoFocus
          onChange={e => { setInput(e.target.value); setError(false); }}
        />
        {error && <div className="operator-guard-error">Nieprawidłowe hasło</div>}
        <button className="operator-guard-btn" type="submit">Wejdź</button>
      </form>
    </div>
  );
}
