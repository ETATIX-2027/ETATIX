import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
export default async function Dashboard(){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/login?next=/dashboard');
 const {data:profile}=await sb.from('etx_profiles').select('display_name,platform_role').eq('id',user.id).maybeSingle();
 return <main className="wrap section"><p className="eyebrow" style={{marginTop:32}}>ACCOUNT CENTER</p><h1>Dashboard</h1><p className="muted">Halo, {profile?.display_name||user.email}. Role: {profile?.platform_role||'customer'}.</p>
 <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',marginTop:28}}>
  <section className="event" style={{padding:22}}><h2>Organizer</h2><p className="muted">Ajukan akun penyelenggara atau kelola event jika sudah disetujui.</p><Link className="btn" href="/organizer">Buka dashboard EO</Link><p><Link href="/organizer/apply" style={{color:'#c4b5fd'}}>Daftar sebagai organizer →</Link></p></section>
  <section className="event" style={{padding:22}}><h2>Tiket saya</h2><p className="muted">Lihat tiket dan pesanan event yang sudah dibeli.</p><Link className="btn secondary" href="/my-tickets">Lihat tiket</Link></section>
  {profile?.platform_role==='admin'&&<section className="event" style={{padding:22}}><h2>Super Admin</h2><p className="muted">Review organizer dan kelola platform.</p><Link className="btn secondary" href="/admin">Buka admin</Link></section>}
 </div><p style={{marginTop:28}}><Link className="btn secondary" href="/events">Jelajahi event</Link></p></main>
}
