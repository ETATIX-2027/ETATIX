'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { readFunctionError, translateCode } from '@/lib/function-error';

type Detection = { rawValue?: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<Detection[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;

export default function OrganizerScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const [supported, setSupported] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'success' | 'error' | 'info'>('info');

  function stopCamera() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  async function checkIn(rawCode: string) {
    const code = rawCode.trim();
    if (!code || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage('Memvalidasi tiket…');
    setKind('info');
    try {
      const sb = createClient();
      const { data, error } = await sb.functions.invoke('etx-checkin', { body: { ticket_code: code.toUpperCase() } });
      if (error) throw new Error(await readFunctionError(error, 'Check-in gagal.'));
      if (data?.error) throw new Error(translateCode(String(data.error)));
      const result = data?.result;
      if (!result) throw new Error('Respons check-in tidak dikenali.');
      setMessage(translateCode(result.message || 'CHECK_IN_SUCCESS'));
      setKind(result.success ? 'success' : 'error');
      setManualCode('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Tidak dapat memvalidasi tiket.');
      setKind('error');
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  async function startCamera() {
    setMessage('');
    const DetectorClass = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
      setSupported(false);
      setMessage('Pemindaian kamera tidak didukung browser ini. Gunakan input kode tiket di bawah.');
      setKind('info');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new DetectorClass({ formats: ['qr_code'] });
      setCameraOn(true);
      const scan = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || busyRef.current) {
          frameRef.current = requestAnimationFrame(scan);
          return;
        }
        try {
          const codes = await detector.detect(video);
          const value = codes.find(item => item.rawValue)?.rawValue;
          if (value) {
            stopCamera();
            await checkIn(value);
            return;
          }
        } catch { /* Kamera tetap berjalan; kode dapat dimasukkan manual. */ }
        frameRef.current = requestAnimationFrame(scan);
      };
      frameRef.current = requestAnimationFrame(scan);
    } catch (e) {
      stopCamera();
      setMessage(e instanceof Error ? e.message : 'Tidak dapat membuka kamera. Periksa izin kamera browser.');
      setKind('error');
    }
  }

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const messageColor = kind === 'success' ? '#9be7bd' : kind === 'error' ? '#ffaaa8' : '#c9c1d8';
  return <main className="wrap section">
    
    <p className="eyebrow" style={{marginTop:30}}>EVENT OPERATIONS</p>
    <h1>Scanner check-in</h1>
    <p className="muted">Pindai QR tiket peserta. Server akan memeriksa keanggotaan tim event dan mencegah tiket dipakai dua kali.</p>
    <section className="event" style={{padding:18,marginTop:20}}>
      <video ref={videoRef} playsInline muted aria-label="Pratinjau kamera pemindai QR" style={{display:cameraOn?'block':'none',width:'100%',maxHeight:420,objectFit:'cover',borderRadius:12,background:'#08070c'}} />
      {!cameraOn && <div style={{display:'grid',placeItems:'center',minHeight:190,border:'1px dashed #514765',borderRadius:12,color:'#aaa1ba',textAlign:'center',padding:20}}><div><div style={{fontSize:42}}>▦</div><strong>Kamera pemindai QR</strong><p className="muted" style={{fontSize:13}}>Gunakan kamera belakang ponsel untuk memindai tiket.</p></div></div>}
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}>
        {!cameraOn ? <button className="btn" onClick={startCamera}>Aktifkan kamera</button> : <button className="btn secondary" onClick={stopCamera}>Matikan kamera</button>}
      </div>
      {!supported && <p className="muted" style={{fontSize:12}}>Browser tidak menyediakan QR BarcodeDetector. Input manual tetap tersedia.</p>}
    </section>
    <section className="event" style={{padding:18,marginTop:16}}>
      <h2>Input kode tiket manual</h2>
      <form onSubmit={e=>{e.preventDefault();void checkIn(manualCode)}} style={{display:'grid',gap:12}}>
        <input value={manualCode} onChange={e=>setManualCode(e.target.value)} placeholder="Tempel atau ketik kode tiket" autoCapitalize="characters" autoComplete="off" style={{width:'100%',background:'#151321',border:'1px solid #39324d',borderRadius:12,padding:13,color:'white',font:'inherit'}} />
        <button className="btn" disabled={busy || !manualCode.trim()}>{busy?'Memeriksa…':'Validasi & check-in'}</button>
      </form>
      {message && <p role="status" aria-live="polite" style={{color:messageColor,marginTop:14}}>{message}</p>}
    </section>
    <p className="muted" style={{fontSize:12,marginTop:18}}>Akses check-in hanya diberikan kepada owner, manager, atau check-in staff event terkait. Halaman ini memerlukan HTTPS dan Edge Function <code>etx-checkin</code> sudah di-deploy.</p>
  </main>;
}
