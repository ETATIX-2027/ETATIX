'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
const field = { background: '#151321', border: '1px solid #39324d', borderRadius: 12, padding: 15, color: 'white', font: 'inherit' } as const;
function LoginForm() {
  const params = useSearchParams();
  const nextPath = params.get('next');
  const safeNext = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.includes('\\') && !/[\u0000-\u001f]/.test(nextPath) ? nextPath : '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign(safeNext);
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Login gagal.'); setBusy(false); }
  }
  return <main className="wrap section" style={{ maxWidth: 480 }}><h1>Masuk ke ETATIX</h1><p className="muted">Gunakan akun Supabase Auth milikmu.</p><form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 24 }}><input aria-label="Email" type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={field} /><input aria-label="Password" type="password" required minLength={6} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={field} /><button className="btn" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button></form>{message && <p role="alert" className="muted">{message}</p>}<p className="muted">Belum punya akun? <Link href={`/register?next=${encodeURIComponent(safeNext)}`} style={{ color: '#c4b5fd' }}>Daftar sekarang</Link></p></main>;
}
export default function Login() { return <Suspense fallback={<main className="wrap section">Memuat…</main>}><LoginForm /></Suspense>; }
