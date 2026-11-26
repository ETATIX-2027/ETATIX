'use client';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const inputStyle = { width:'100%', background:'#151321', border:'1px solid #39324d', borderRadius:12, padding:14, color:'white', font:'inherit' } as const;

export default function OrganizerApplyPage(){
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [description,setDescription]=useState('');
  const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const sb=createClient(); const {data:{user},error:authError}=await sb.auth.getUser();
      if(authError || !user) throw new Error('Silakan login terlebih dahulu.');
      const {error}=await sb.from('etx_organizer_applications').insert({user_id:user.id,organization_name:name.trim(),contact_email:email.trim(),description:description.trim()||null,status:'pending'});
      if(error){ if(error.code==='23505') throw new Error('Anda masih memiliki pengajuan organizer yang menunggu peninjauan.'); throw error; }
      setMessage('Pengajuan berhasil dikirim. Tim ETATIX akan meninjau pengajuan ini.'); setName(''); setEmail(''); setDescription('');
    } catch(err){setMessage(err instanceof Error?err.message:'Pengajuan gagal dikirim.');}
    finally{setBusy(false);}
  }
  return <main className="wrap section" style={{maxWidth:680}}>
    
    <p className="eyebrow" style={{marginTop:38}}>ETATIX ORGANIZER</p><h1>Daftarkan penyelenggara</h1>
    <p className="muted">Ajukan akun organizer untuk mulai membuat dan mengelola event di ETATIX. Pengajuan akan ditinjau admin.</p>
    <form onSubmit={submit} style={{display:'grid',gap:14,marginTop:28}}>
      <label>Nama organisasi / EO<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Maju Bersama Event" style={inputStyle}/></label>
      <label>Email kontak<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@organisasi.id" style={inputStyle}/></label>
      <label>Deskripsi organisasi<textarea maxLength={2000} rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ceritakan organisasi dan jenis event yang diselenggarakan..." style={inputStyle}/></label>
      <button className="btn" disabled={busy}>{busy?'Mengirim…':'Kirim pengajuan'}</button>
    </form>
    {message&&<p role="status" className="muted" style={{marginTop:18}}>{message}</p>}
    <p className="muted" style={{marginTop:22,fontSize:13}}>Sudah menjadi organizer? <Link href="/organizer" style={{color:'#c4b5fd'}}>Buka dashboard organizer</Link></p>
  </main>
}
