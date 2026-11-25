import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { EventCheckout } from './checkout';

type EventRow = {
  id: string; title: string; slug: string; description: string | null;
  category: string | null; venue_name: string | null; address: string | null;
  city: string | null; start_at: string; end_at: string | null; cover_image_url: string | null;
};
type TicketRow = {
  id: string; name: string; description: string | null; price: number;
  currency: string; quantity_total: number; quantity_reserved: number;
  quantity_sold: number; sales_start_at: string | null; sales_end_at: string | null;
};

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: eventData, error } = await supabase.from('etx_events')
    .select('id,title,slug,description,category,venue_name,address,city,start_at,end_at,cover_image_url')
    .eq('slug', slug).eq('status', 'published').maybeSingle();
  if (error || !eventData) notFound();
  const event = eventData as EventRow;
  const { data: ticketData } = await supabase.from('etx_ticket_types')
    .select('id,name,description,price,currency,quantity_total,quantity_reserved,quantity_sold,sales_start_at,sales_end_at')
    .eq('event_id', event.id).eq('is_active', true).order('price', { ascending: true });
  const tickets = (ticketData || []) as TicketRow[];
  const date = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(event.start_at));

  return <><main className="wrap section" style={{ maxWidth: 980 }}>
    <Link href="/events" className="muted">← Kembali ke daftar event</Link>
    <div style={{ marginTop: 22, minHeight: 220, borderRadius: 22, padding: 28, display: 'flex', alignItems: 'end', background: event.cover_image_url ? `linear-gradient(0deg,rgba(10,8,18,.86),rgba(10,8,18,.08)),url(${event.cover_image_url}) center/cover` : 'radial-gradient(circle at 75% 20%,#7042c9,#211832 70%)' }}>
      <div><div className="eyebrow">{event.category || 'ETATIX EVENT'}</div><h1 style={{ fontSize: 'clamp(30px,5vw,48px)', margin: '10px 0 0' }}>{event.title}</h1></div>
    </div>
    <div className="event-detail-grid">
      <section className="event-panel">
        <h2>Informasi event</h2><p className="muted">{date} WIB</p>
        <p>{event.venue_name || 'Lokasi akan diumumkan'}{event.city ? ` · ${event.city}` : ''}</p>
        {event.address && <p className="muted">{event.address}</p>}
        {event.description && <p style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{event.description}</p>}
      </section>
      <section className="event-panel">
        <h2>Pilih tiket</h2>
        {tickets.length ? <EventCheckout eventSlug={event.slug} tickets={tickets.map(t => ({
          id: t.id, name: t.name, description: t.description, price: Number(t.price), currency: t.currency,
          available: Math.max(0, t.quantity_total - t.quantity_reserved - t.quantity_sold),
          salesStartAt: t.sales_start_at, salesEndAt: t.sales_end_at,
        }))} /> : <p className="muted">Tiket belum tersedia untuk event ini.</p>}
        <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>Pembayaran diproses melalui Midtrans. Tiket diterbitkan setelah pembayaran terkonfirmasi.</p>
      </section>
    </div>
  </main></>;
}
