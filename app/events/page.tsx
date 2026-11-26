import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';

type PublicEvent = { id: string; title: string; slug: string; city: string | null; start_at: string; cover_image_url: string | null };
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const params = await searchParams;
  const search = (params.search || '').trim().slice(0, 120);
  let events: PublicEvent[] = []; let error = '';
  try {
    const supabase = await createClient();
    let eventQuery = supabase.from('etx_events').select('id,title,slug,city,start_at,cover_image_url').eq('status', 'published');
    if (search) eventQuery = eventQuery.ilike('title', `%${search.replace(/[,%]/g, '')}%`);
    const result = await eventQuery.order('start_at', { ascending: true });
    if (result.error) throw result.error;
    events = (result.data || []) as PublicEvent[];
  } catch {
    error = 'Katalog belum terhubung. Pastikan environment Supabase dan migration sudah dipasang.';
  }
  return <><main className="wrap section"><div className="eyebrow">ETATIX DISCOVERY</div><h1>Jelajahi event</h1>{search && <p className="muted">Hasil pencarian untuk: <strong>{search}</strong></p>}{error && <p className="muted">{error}</p>}{!events.length ? <p className="muted">Belum ada event yang dipublikasikan.</p> : <div className="grid">{events.map(e => <Link className="event" href={`/events/${e.slug}`} key={e.id}><div className="event-art" style={e.cover_image_url ? { background: `linear-gradient(0deg,rgba(10,8,18,.65),rgba(10,8,18,.05)),url(${e.cover_image_url}) center/cover` } : undefined}>{e.title}</div><div className="event-body"><h3>{e.title}</h3><p>{e.city || 'Indonesia'} · {e.start_at ? new Date(e.start_at).toLocaleDateString('id-ID') : ''}</p><span className="price">Lihat tiket →</span></div></Link>)}</div>}</main></>;
}
