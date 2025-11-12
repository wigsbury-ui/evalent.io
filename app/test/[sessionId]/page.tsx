'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = {
  id: string;
  stem: string;
  type: 'mcq'|'short';
  options?: string[];
};

type Asset = {
  item_id: string;
  video_title?: string;
  video_id?: string;
  share_url?: string;
  download_url?: string;
  video_thumbnail?: string;
  player_url?: string;
};

function vimeoPlayerUrlFromShare(share?: string): string | null {
  if (!share) return null;
  const m = share.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m && m[1]) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

export default function TestPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const [item, setItem] = useState<Item | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [value, setValue] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function loadNext() {
    setError(null);
    const url = `/api/next-item?session_id=${sessionId}&_=${Date.now()}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) { setError(await res.text()); return; }
    const data = await res.json();
    if (!data.item) { setDone(true); return; }
    setItem(data.item);
    setAsset(data.asset || null);
    setValue('');
  }

  async function submit() {
    if (!item) return;
    const url = `/api/submit?session_id=${sessionId}&item_id=${item.id}&response=${encodeURIComponent(value)}&_=${Date.now()}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) { setError(await res.text()); return; }
    await loadNext();
  }

  async function finish() {
    const res = await fetch(`/api/finish`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    })
    if (!res.ok) { setError(await res.text()); return; }
    router.push(`/thanks?session=${sessionId}`);
  }

  useEffect(() => { loadNext(); }, []);

  if (done) {
    return (
      <main>
        <div className="card">
          <h2>All questions complete</h2>
          <button onClick={finish}>Submit Test</button>
        </div>
      </main>
    )
  }

  const playerSrc = asset?.player_url || vimeoPlayerUrlFromShare(asset?.share_url) || null;

  return (
    <main>
      <div className="card">
        {error && <p style={{color:'crimson'}}>{error}</p>}
        {!item && <p>Loading…</p>}
        {item && (
          <div>
            {playerSrc && (
              <div style={{marginBottom:12, position:'relative', paddingBottom:'56.25%', height:0, overflow:'hidden', borderRadius:12}}>
                <iframe
                  src={playerSrc}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', border:0}}
                  title={asset?.video_title || 'Question Video'}
                />
              </div>
            )}
            <div style={{marginBottom:12}}>{item.stem}</div>
            {item.type === 'mcq' ? (
              <div>
                {(item.options || []).map((opt, i) => (
                  <label key={i} style={{display:'block', marginBottom:8}}>
                    <input type="radio" name="opt" value={opt} checked={value===opt} onChange={e=>setValue(e.target.value)} /> {opt}
                  </label>
                ))}
              </div>
            ) : (
              <textarea rows={4} value={value} onChange={e=>setValue(e.target.value)} />
            )}
            <div style={{marginTop:12}}>
              <button onClick={submit} disabled={!value}>Submit answer</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
