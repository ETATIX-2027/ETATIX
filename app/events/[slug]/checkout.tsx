'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { readFunctionError, translateCode } from '@/lib/function-error';

type Ticket = {
  id: string; name: string; description: string | null; price: number; currency: string;
  available: number; salesStartAt: string | null; salesEndAt: string | null;
};
const field: React.CSSProperties = { width: '100%', background: '#0f0d18', border: '1px solid #39324d', borderRadius: 11, padding: 13, color: 'white', font: 'inherit' };
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export function EventCheckout({ eventSlug, tickets }: { eventSlug: string; tickets: Ticket[] }) {
  const [ticketId, setTicketId] = useState(tickets.find(t => t.available > 0)?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [identityType, setIdentityType] = useState('KTP');
  const [identityNumber, setIdentityNumber] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = tickets.find(t => t.id === ticketId);
  const available = selected?.available || 0;
  const total = useMemo(() => (selected?.price || 0) * quantity, [selected, quantity]);
  const now = Date.now();
  const saleOpen = !!selected && (!selected.salesStartAt || new Date(selected.salesStartAt).getTime() <= now) && (!selected.salesEndAt || new Date(selected.salesEndAt).getTime() >= now);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    if (!selected || available < 1 || !saleOpen) { setError('Penjualan tiket ini belum dibuka atau kuota telah habis.'); return; }
    if (quantity < 1 || quantity > Math.min(20, available)) { setError('Jumlah tiket melebihi kuota yang tersedia (maksimal 20 tiket).'); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        window.location.assign(`/login?next=${encodeURIComponent(`/events/${eventSlug}`)}`);
        return;
      }
      const { data, error: invokeError } = await supabase.functions.invoke('etx-create-order', {
        body: { ticket_type_id: selected.id, quantity, buyer_name: buyerName.trim(), buyer_email: buyerEmail.trim(), buyer_identity_type: identityType, buyer_identity_number: identityNumber.trim(), buyer_whatsapp: whatsapp.trim(), buyer_address: address.trim() },
      });
      if (invokeError) throw new Error(await readFunctionError(invokeError, 'Tidak dapat menghubungi layanan pembayaran.'));
      if (!data?.success || !data?.payment?.redirect_url) throw new Error(translateCode(String(data?.message || data?.error || 'Transaksi belum berhasil dibuat.')));
      window.location.assign(data.payment.redirect_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout gagal. Silakan coba kembali.');
      setBusy(false);
    }
  }

  return <form onSubmit={submit} style={{ display: 'grid', gap: 13 }}>
    <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>Kategori tiket
      <select required value={ticketId} onChange={e => { setTicketId(e.target.value); setQuantity(1); }} style={field}>
        {tickets.map(t => <option key={t.id} value={t.id} disabled={t.available < 1}>{t.name} — {money(t.price)}{t.available < 1 ? ' (Habis)' : ` · ${t.available} tersedia`}</option>)}
      </select>
    </label>
    {selected?.description && <p className="muted" style={{ fontSize: 13, margin: 0 }}>{selected.description}</p>}
    <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>Jumlah tiket
      <select value={quantity} onChange={e => setQuantity(Number(e.target.value))} style={field} disabled={!available}>
        {Array.from({ length: Math.max(1, Math.min(20, available)) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} tiket</option>)}
      </select>
    </label>
    <div style={{ borderTop: '1px solid #39324d', borderBottom: '1px solid #39324d', padding: '14px 0', display: 'flex', justifyContent: 'space-between', gap: 12 }}><span className="muted">Total pembayaran</span><strong style={{ color: '#c4b5fd' }}>{money(total)}</strong></div>
    <h3 style={{ margin: '8px 0 0' }}>Data pemesan</h3>
    <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>Nama lengkap<input required minLength={2} maxLength={100} autoComplete="name" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Nama sesuai identitas" style={field} /></label>
    <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>Jenis identitas<select required value={identityType} onChange={e => setIdentityType(e.target.value)} style={field}><option value="KTP">KTP</option><option value="SIM">SIM</option><option value="PASPOR">Paspor</option><option value="KARTU_PELAJAR">Kartu Pelajar</option><option value="LAINNYA">Lainnya</option></select></label>
    <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>Nomor identitas<input required minLength={4} maxLength={50} value={identityNumber} onChange={e => setIdentityNumber(e.target.value)} placeholder="Nomor identitas" style={field} /></label>
    <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>Email aktif<input required type="email" maxLength={254} autoComplete="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="nama@email.com" style={field} /></label>
    <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>No. WhatsApp<input required type="tel" minLength={9} maxLength={20} autoComplete="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="08xxxxxxxxxx" style={field} /></label>
    <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>Alamat lengkap<textarea required minLength={8} maxLength={500} autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Alamat lengkap" style={{ ...field, minHeight: 90, resize: 'vertical' }} /></label>
    {error && <p role="alert" style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>}
    <button className="btn" type="submit" disabled={busy || !selected || !available || !saleOpen}>{busy ? 'Menyiapkan pembayaran…' : 'Lanjutkan ke pembayaran'}</button>
    <p className="muted" style={{ fontSize: 12, margin: 0 }}>Dengan melanjutkan, Anda akan diarahkan ke halaman pembayaran aman Midtrans. <Link href="/login" style={{ color: '#c4b5fd' }}>Masuk dengan akun lain</Link>.</p>
  </form>;
}
