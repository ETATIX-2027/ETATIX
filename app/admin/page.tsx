'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Application = { id: string; user_id: string; organization_name: string; contact_email: string; description: string | null; status: string; created_at: string };
type PendingEvent = { id: string; title: string; slug: string; city: string | null; start_at: string; organizer_name: string; active_ticket_types: number; created_at: string };

const ERRORS: Record<string, string> = {
  'event has no active ticket types': 'Event belum memiliki kategori tiket aktif.',
  'organizer is not verified': 'Organizer belum berstatus terverifikasi.',
  'event not found or not pending review': 'Event tidak ditemukan atau sudah diproses.',
  'application not found or already reviewed': 'Pengajuan tidak ditemukan atau sudah diproses.',
};
const errText = (e: unknown, fallback: string) => {
  const m = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '';
  return m ? (ERRORS[m] || m) : fallback;
};

export default function AdminDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Silakan login dengan akun admin.');
      const { data: profile, error: pe } = await sb.from('etx_profiles').select('platform_role').eq('id', user.id).single();
      if (pe) throw pe;
      if (profile.platform_role !== 'admin') throw new Error('Akses ditolak. Halaman ini khusus Super Admin.');
      const [a, ev] = await Promise.all([sb.rpc('etx_admin_list_organizer_applications'), sb.rpc('etx_admin_list_pending_events')]);
      if (a.error) throw a.error;
      if (ev.error) throw ev.error;
      setApps((a.data || []) as Application[]);
      setEvents((ev.data || []) as PendingEvent[]);
    } catch (e) { setMessage(errText(e, 'Gagal memuat data admin.')); setApps([]); setEvents([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function reviewApplication(id: string, decision: 'approved' | 'rejected') {
    setBusy(id); setMessage('');
    try {
      const sb = createClient();
      const { error } = await sb.rpc('etx_admin_review_organizer_application', { p_application_id: id, p_decision: decision });
      if (error) throw error;
      setMessage(decision === 'approved' ? 'Organizer disetujui dan akun owner dibuat.' : 'Pengajuan ditolak.');
      await load();
    } catch (e) { setMessage(errText(e, 'Proses review gagal.')); }
    finally { setBusy(''); }
  }

  async function reviewEvent(id: string, decision: 'approved' | 'rejected') {
    setBusy(id); setMessage('');
    try {
      const sb = createClient();
      const { error } = await sb.rpc('etx_admin_review_event', { p_event_id: id, p_decision: decision });
      if (error) throw error;
      setMessage(decision === 'approved' ? 'Event disetujui dan sekarang tayang di katalog.' : 'Event ditolak dan dikembalikan ke organizer.');
      await load();
    } catch (e) { setMessage(errText(e, 'Review event gagal.')); }
    finally { setBusy(''); }
  }

  return <main className="wrap section">
    
    <p className="eyebrow" style={{ marginTop: 30 }}>PLATFORM CONTROL</p>
    <h1>Super Admin</h1>
    <p className="muted">Review permohonan organizer dan event ETATIX.</p>
    {message && <p role="status" className="muted">{message}</p>}
    {loading ? <p className="muted">Memuat data…</p> : <>
      <h2 style={{ marginTop: 28 }}>Pengajuan organizer</h2>
      {apps.length === 0 ? <section className="event" style={{ padding: 22 }}><p className="muted">Tidak ada pengajuan organizer yang tertunda.</p></section> : apps.map(a => <article className="event" key={a.id} style={{ padding: 22, marginTop: 14 }}>
        <div className="section-head"><div><h3 style={{ margin: 0 }}>{a.organization_name}</h3><p className="muted">{a.contact_email} · {new Date(a.created_at).toLocaleString('id-ID')}</p></div><span className="eyebrow">PENDING</span></div>
        <p className="muted">{a.description || 'Tidak ada deskripsi.'}</p>
        <p className="muted" style={{ fontSize: 12 }}>Applicant: {a.user_id}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" disabled={!!busy} onClick={() => void reviewApplication(a.id, 'approved')}>{busy === a.id ? 'Memproses…' : 'Setujui organizer'}</button>
          <button className="btn secondary" disabled={!!busy} onClick={() => void reviewApplication(a.id, 'rejected')}>Tolak</button>
        </div>
      </article>)}

      <h2 style={{ marginTop: 36 }}>Event menunggu review</h2>
      {events.length === 0 ? <section className="event" style={{ padding: 22 }}><p className="muted">Tidak ada event yang menunggu review.</p></section> : events.map(ev => <article className="event" key={ev.id} style={{ padding: 22, marginTop: 14 }}>
        <div className="section-head"><div><h3 style={{ margin: 0 }}>{ev.title}</h3><p className="muted">{ev.organizer_name} · {ev.city || 'Kota belum diisi'} · {new Date(ev.start_at).toLocaleString('id-ID')}</p></div><span className="eyebrow">REVIEW</span></div>
        <p className="muted" style={{ fontSize: 13 }}>/{ev.slug} · {ev.active_ticket_types} kategori tiket aktif</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" disabled={!!busy} onClick={() => void reviewEvent(ev.id, 'approved')}>{busy === ev.id ? 'Memproses…' : 'Setujui & tayangkan'}</button>
          <button className="btn secondary" disabled={!!busy} onClick={() => void reviewEvent(ev.id, 'rejected')}>Tolak</button>
        </div>
      </article>)}
    </>}
  </main>;
}
