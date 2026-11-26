'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type PaymentState = { status: string; order_number: string; total_amount: number; expires_at: string };
function ResultContent() {
  const params = useSearchParams();
  const orderNumber = params.get('order') || '';
  const [order, setOrder] = useState<PaymentState | null>(null);
  const [message, setMessage] = useState('Memeriksa status pembayaran…');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) { setMessage('Nomor pesanan tidak ditemukan pada tautan ini.'); setLoading(false); return; }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const supabase = createClient();
    const check = async () => {
      const { data, error } = await supabase.from('etx_orders')
        .select('status,order_number,total_amount,expires_at')
        .eq('order_number', orderNumber).maybeSingle();
      if (!active) return;
      if (error) { setMessage('Silakan masuk menggunakan akun yang dipakai saat memesan, lalu muat ulang halaman ini.'); setLoading(false); return; }
      if (!data) { setMessage('Pesanan tidak ditemukan atau Anda tidak memiliki akses ke pesanan ini.'); setLoading(false); return; }
      setOrder(data as PaymentState); setLoading(false);
      if (data.status === 'paid') setMessage('Pembayaran berhasil dikonfirmasi. Tiket Anda sudah diproses.');
      else if (data.status === 'expired') setMessage('Batas waktu pembayaran telah berakhir. Silakan lakukan pemesanan ulang.');
      else if (data.status === 'cancelled') setMessage('Pesanan ini dibatalkan.');
      else if (data.status === 'pending' && attempts < 20) {
        setMessage('Menunggu konfirmasi pembayaran dari Midtrans…');
        attempts += 1; timer = setTimeout(check, 3000);
      } else setMessage('Status pesanan masih menunggu. Periksa kembali beberapa saat lagi.');
    };
    void check();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [orderNumber]);

  const paid = order?.status === 'paid';
  return <main className="wrap section" style={{ maxWidth: 620 }}>
    
    <section className="event-panel" style={{ marginTop: 38, textAlign: 'center', padding: 30 }}>
      <div style={{ fontSize: 42, marginBottom: 12 }}>{paid ? '✓' : loading ? '…' : '◷'}</div>
      <div className="eyebrow">STATUS PEMBAYARAN</div>
      <h1 style={{ fontSize: 30, margin: '12px 0' }}>{paid ? 'Pembayaran berhasil' : 'Pemesanan Anda'}</h1>
      <p className="muted" role="status">{message}</p>
      {order && <div style={{ background: '#0f0d18', borderRadius: 12, padding: 16, textAlign: 'left', marginTop: 22 }}>
        <p style={{ margin: '0 0 8px' }}>Nomor pesanan: <strong>{order.order_number}</strong></p>
        <p style={{ margin: '0 0 8px' }}>Total: <strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(order.total_amount))}</strong></p>
        <p style={{ margin: 0 }}>Status: <strong>{order.status.toUpperCase()}</strong></p>
      </div>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
        <Link className="btn" href="/my-tickets">Lihat tiket saya</Link>
        <Link className="btn secondary" href="/events">Jelajahi event</Link>
      </div>
    </section>
  </main>;
}
export default function PaymentResultPage() {
  return <Suspense fallback={<main className="wrap section">Memuat status pembayaran…</main>}><ResultContent /></Suspense>;
}
