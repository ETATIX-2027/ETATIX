'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Membership = { organizer_id: string; member_role: string; organizer: { id: string; name: string; slug: string; verification_status: string } | null };
type EventRow = { id: string; title: string; slug: string; status: string; city: string | null; start_at: string };
type TicketTypeRow = { id: string; event_id: string; name: string; price: number; quantity_total: number; quantity_sold: number; is_active: boolean };

const STATUS_LABEL: Record<string, string> = {
  draft: 'DRAFT', pending_review: 'MENUNGGU REVIEW', published: 'TAYANG', rejected: 'DITOLAK', cancelled: 'DIBATALKAN', completed: 'SELESAI',
};
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function OrganizerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Membership[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tickets, setTickets] = useState<Record<string, TicketTypeRow[]>>({});
  const [selected, setSelected] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [start, setStart] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [ticketForm, setTicketForm] = useState<{ eventId: string; name: string; price: string; quantity: string } | null>(null);
  const [rowNotice, setRowNotice] = useState('');
  const [rowBusy, setRowBusy] = useState('');

  const loadEvents = useCallback(async (organizerId: string) => {
    const sb = createClient();
    const { data: ev, error: ee } = await sb.from('etx_events').select('id,title,slug,status,city,start_at').eq('organizer_id', organizerId).order('created_at', { ascending: false });
    if (ee) throw ee;
    const list = (ev || []) as EventRow[];
    setEvents(list);
    if (list.length) {
      const { data: tt, error: te } = await sb.from('etx_ticket_types').select('id,event_id,name,price,quantity_total,quantity_sold,is_active').in('event_id', list.map(x => x.id)).order('price', { ascending: true });
      if (te) throw te;
      const grouped: Record<string, TicketTypeRow[]> = {};
      ((tt || []) as TicketTypeRow[]).forEach(t => { (grouped[t.event_id] ||= []).push(t); });
      setTickets(grouped);
    } else setTickets({});
  }, []);

  const load = useCallback(async (preferred?: string) => {
    setLoading(true); setError('');
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Silakan login terlebih dahulu.');
      const { data, error: me } = await sb.from('etx_organizer_members').select('organizer_id,member_role,organizer:etx_organizers(id,name,slug,verification_status)').eq('user_id', user.id);
      if (me) throw me;
      const rows = (data || []) as unknown as Membership[];
      setMembers(rows);
      if (rows.length) {
        const active = preferred && rows.some(x => x.organizer_id === preferred) ? preferred : rows[0].organizer_id;
        setSelected(active);
        await loadEvents(active);
      } else { setEvents([]); setTickets({}); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Tidak dapat memuat dashboard.'); }
    finally { setLoading(false); }
  }, [loadEvents]);

  useEffect(() => { void load(); }, [load]);

  async function choose(id: string) {
    setSelected(id); setLoading(true); setError('');
    try { await loadEvents(id); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat event.'); }
    finally { setLoading(false); }
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault(); if (!selected) return;
    setSaving(true); setNotice('');
    try {
      const sb = createClient();
      const cleanSlug = slugify(slug);
      if (!cleanSlug) throw new Error('Slug event tidak valid.');
      const startDate = new Date(start);
      if (Number.isNaN(startDate.getTime())) throw new Error('Tanggal mulai tidak valid.');
      const { error: ie } = await sb.from('etx_events').insert({ organizer_id: selected, title: title.trim(), slug: cleanSlug, city: city.trim() || null, venue_name: venue.trim() || null, start_at: startDate.toISOString(), description: description.trim() || null, status: 'draft' });
      if (ie) { if (ie.code === '23505') throw new Error('Slug sudah dipakai event lain. Ubah slug.'); throw ie; }
      setNotice('Event draft berhasil dibuat. Tambahkan kategori tiket, lalu ajukan review.');
      setTitle(''); setSlug(''); setCity(''); setVenue(''); setStart(''); setDescription('');
      await loadEvents(selected);
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Gagal membuat event.'); }
    finally { setSaving(false); }
  }

  async function addTicketType(e: React.FormEvent) {
    e.preventDefault(); if (!ticketForm) return;
    const price = Number(ticketForm.price); const quantity = Number(ticketForm.quantity);
    if (!ticketForm.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) { setRowNotice('Nama, harga (≥ 0), dan kuota (bilangan bulat ≥ 1) wajib diisi dengan benar.'); return; }
    setRowBusy(ticketForm.eventId); setRowNotice('');
    try {
      const sb = createClient();
      const { error: ie } = await sb.from('etx_ticket_types').insert({ event_id: ticketForm.eventId, name: ticketForm.name.trim(), price, quantity_total: quantity, currency: 'IDR', is_active: true });
      if (ie) throw ie;
      setTicketForm(null); setRowNotice('Kategori tiket ditambahkan.');
      await loadEvents(selected);
    } catch (err) { setRowNotice(err instanceof Error ? err.message : 'Gagal menambah kategori tiket.'); }
    finally { setRowBusy(''); }
  }

  async function submitForReview(eventId: string) {
    setRowBusy(eventId); setRowNotice('');
    try {
      const sb = createClient();
      const { error: ue } = await sb.from('etx_events').update({ status: 'pending_review', updated_at: new Date().toISOString() }).eq('id', eventId);
      if (ue) throw ue;
      setRowNotice('Event diajukan untuk review admin.');
      await loadEvents(selected);
    } catch (err) { setRowNotice(err instanceof Error ? err.message : 'Gagal mengajukan review.'); }
    finally { setRowBusy(''); }
  }

  const active = members.find(m => m.organizer_id === selected);
  const canManage = active?.member_role === 'owner' || active?.member_role === 'manager';

  return <main className="wrap section">
    <div className="section-head">
      <div><p className="eyebrow" style={{ marginTop: 26 }}>ORGANIZER WORKSPACE</p><h1>Dashboard Organizer</h1><p className="muted">Kelola event, kategori tiket, dan status publikasi.</p></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link className="btn secondary" href="/organizer/scanner">Scanner check-in</Link><Link className="btn secondary" href="/organizer/apply">Daftar organizer</Link></div>
    </div>
    {loading ? <p className="muted">Memuat dashboard…</p> : error ? <p role="alert" className="muted">{error} {error.includes('login') && <Link href="/login?next=/organizer" style={{ color: '#c4b5fd' }}>Masuk →</Link>}</p> : members.length === 0 ? <section className="event" style={{ padding: 28 }}><h2>Belum ada akses organizer</h2><p className="muted">Ajukan pendaftaran organizer. Setelah disetujui admin, dashboard ini akan aktif.</p><Link className="btn" href="/organizer/apply">Ajukan sebagai organizer</Link></section> : <>
      <section className="event" style={{ padding: 22, marginBottom: 24 }}>
        <p className="eyebrow">ORGANIZER</p>
        <select aria-label="Pilih organisasi" value={selected} onChange={e => void choose(e.target.value)} className="field">{members.map(m => <option key={m.organizer_id} value={m.organizer_id}>{m.organizer?.name || m.organizer_id} · {m.member_role}</option>)}</select>
        <p className="muted">Status verifikasi: {active?.organizer?.verification_status || '—'}</p>
      </section>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', alignItems: 'start' }}>
        {canManage ? <section className="event" style={{ padding: 22 }}>
          <h2>Buat event</h2><p className="muted" style={{ fontSize: 13 }}>Event baru disimpan sebagai draft.</p>
          <form onSubmit={createEvent} className="stack">
            <input required maxLength={160} value={title} onChange={e => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} placeholder="Nama event" aria-label="Nama event" className="field" />
            <input required maxLength={180} value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug-event" aria-label="Slug event" className="field" />
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Kota" aria-label="Kota" className="field" />
            <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Nama venue" aria-label="Nama venue" className="field" />
            <label className="muted" style={{ fontSize: 13 }}>Tanggal dan waktu mulai<input required type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="field" /></label>
            <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Deskripsi event" aria-label="Deskripsi event" className="field" />
            <button className="btn" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan draft event'}</button>
          </form>
          {notice && <p role="status" className="muted">{notice}</p>}
        </section> : <section className="event" style={{ padding: 22 }}><h2>Akses staf</h2><p className="muted">Peran Anda hanya dapat melakukan check-in. Gunakan halaman Scanner check-in.</p></section>}
        <section>
          <h2>Event saya</h2><p className="muted">{events.length} event tercatat</p>
          {rowNotice && <p role="status" className="muted">{rowNotice}</p>}
          {events.length === 0 ? <div className="event" style={{ padding: 20 }}><p className="muted">Belum ada event. Buat event draft pertama.</p></div> : events.map(ev => {
            const types = tickets[ev.id] || [];
            const editable = ev.status === 'draft' || ev.status === 'rejected';
            return <article className="event" key={ev.id} style={{ padding: 17, marginBottom: 12 }}>
              <h3>{ev.title}</h3>
              <p className="muted">{ev.city || 'Lokasi belum diisi'} · {new Date(ev.start_at).toLocaleString('id-ID')}</p>
              <span className="eyebrow">{STATUS_LABEL[ev.status] || ev.status.toUpperCase()}</span>
              <p className="muted" style={{ fontSize: 12 }}>/{ev.slug}</p>
              {types.length > 0 ? <ul className="muted" style={{ fontSize: 13, paddingLeft: 18 }}>{types.map(t => <li key={t.id}>{t.name} — {money(Number(t.price))} · terjual {t.quantity_sold}/{t.quantity_total}{t.is_active ? '' : ' (nonaktif)'}</li>)}</ul> : <p className="muted" style={{ fontSize: 13 }}>Belum ada kategori tiket.</p>}
              {canManage && ticketForm?.eventId === ev.id ? <form onSubmit={addTicketType} className="stack" style={{ marginTop: 10 }}>
                <input required maxLength={80} placeholder="Nama kategori (mis. Regular)" aria-label="Nama kategori tiket" value={ticketForm.name} onChange={e => setTicketForm({ ...ticketForm, name: e.target.value })} className="field" />
                <input required type="number" min={0} step={1000} placeholder="Harga (Rp)" aria-label="Harga tiket" value={ticketForm.price} onChange={e => setTicketForm({ ...ticketForm, price: e.target.value })} className="field" />
                <input required type="number" min={1} step={1} placeholder="Kuota" aria-label="Kuota tiket" value={ticketForm.quantity} onChange={e => setTicketForm({ ...ticketForm, quantity: e.target.value })} className="field" />
                <div style={{ display: 'flex', gap: 8 }}><button className="btn" disabled={rowBusy === ev.id}>Simpan tiket</button><button type="button" className="btn secondary" onClick={() => setTicketForm(null)}>Batal</button></div>
              </form> : canManage && (editable || ev.status === 'published') && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button className="btn secondary" onClick={() => { setRowNotice(''); setTicketForm({ eventId: ev.id, name: '', price: '', quantity: '' }); }}>+ Kategori tiket</button>
                {editable && <button className="btn" disabled={rowBusy === ev.id || types.length === 0} title={types.length === 0 ? 'Tambahkan minimal satu kategori tiket' : undefined} onClick={() => void submitForReview(ev.id)}>{rowBusy === ev.id ? 'Memproses…' : 'Ajukan review'}</button>}
              </div>}
            </article>;
          })}
        </section>
      </div></>}
  </main>;
}
