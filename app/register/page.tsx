'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
const field = { width: '100%', background: '#151321', border: '1px solid #39324d', borderRadius: 12, padding: 14, color: 'white', font: 'inherit' } as const;
function RegisterForm() {
  const params = useSearchParams();
  const nextPath = params.get('next');
  const safeNext = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.includes('\\') && !/[\u0000-\u001f]/.test(nextPath) ? nextPath : '/dashboard';
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const sb = createClient();
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name.trim() } } });
      if (error) throw error;
      setMessage(data.session ? 'Akun berhasil dibuat. Mengalihkan…' : 'Pendaftaran berhasil. Periksa email untuk verifikasi akun sebelum login.');
      if (data.session) window.location.assign(safeNext);
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Registrasi gagal.'); setBusy(false); }
  }
  return <main className="wrap section" style={{ maxWidth: 500 }}><p className="eyebrow" style={{ marginTop: 34 }}>CREATE ACCOUNT</p><h1>Daftar ETATIX</h1><p className="muted">Buat akun untuk membeli tiket atau mengajukan akun organizer.</p><form onSubmit={submit} style={{ display: 'grid', gap: 13, marginTop: 24 }}><input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" style={field} /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={field} /><input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password minimal 8 karakter" style={field} /><button className="btn" disabled={busy}>{busy ? 'Membuat akun…' : 'Buat akun'}</button></form>{message && <p role="status" className="muted">{message}</p>}<p className="muted">Sudah punya akun? <Link href={`/login?next=${encodeURIComponent(safeNext)}`} style={{ color: '#c4b5fd' }}>Masuk</Link></p></main>;
}
export default function Register() { return <Suspense fallback={<main className="wrap section">Memuat…</main>}><RegisterForm /></Suspense>; }
