'use client';
import { useState } from 'react';

export default function StartPage() {
  const [name, setName] = useState('');
  const [year, setYear] = useState('Y7');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_name: name, year, passcode: pass })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      window.location.href = `/test/${data.session.id}`;
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="card">
        <h2>Start Admissions Test</h2>
        <div className="row">
          <div>
            <label>Student name</label>
            <input value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label>Year</label>
            <select value={year} onChange={e=>setYear(e.target.value)}>
              {['Y3','Y4','Y5','Y6','Y7','Y8','Y9','Y10','Y11'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label>Passcode</label>
          <input value={pass} onChange={e=>setPass(e.target.value)} />
        </div>
        {error && <p style={{color:'crimson'}}>{error}</p>}
        <button onClick={start} disabled={loading || !name || !year || !pass}>{loading?'Starting…':'Start Test'}</button>
      </div>
    </main>
  );
}
