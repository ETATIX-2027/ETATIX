# ETATIX — Paket Deployment Domain etatix.my.id

Paket ini menyiapkan aplikasi Next.js untuk dipublikasikan melalui Vercel, memakai project Supabase yang sudah ada, dan Midtrans Sandbox terlebih dahulu.

## Status dan batasan

- Domain target: `https://etatix.my.id`.
- Pembayaran diset ke Sandbox (`MIDTRANS_IS_PRODUCTION=false`).
- Jangan aktifkan Production sebelum transaksi Sandbox, webhook, penerbitan tiket, dan pengujian keamanan berhasil.
- Database existing dipertahankan. Migration 001–003 jangan dijalankan ulang.
- Migration tambahan `supabase/migrations/202611250004_checkout_buyer_details.sql` menambahkan detail pembeli dan overload RPC checkout. Jalankan hanya setelah backup dan verifikasi bahwa migration ini belum pernah diterapkan.
- ZIP tidak berisi kredensial Midtrans atau Supabase service role.

## 1. Persiapan lokal

Gunakan Node.js 20 LTS atau versi yang didukung Next.js 15, lalu:

```bash
npm install
cp .env.example .env.local
```

Isi `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Jangan masukkan Server Key Midtrans, Signature Secret Key, atau Supabase service role ke `.env.local`, Git, atau variabel `NEXT_PUBLIC_*`.

## 2. Database Supabase yang sudah ada

1. Buka Supabase Dashboard → SQL Editor.
2. Buat backup database terlebih dahulu.
3. Periksa apakah kolom `buyer_identity_type`, `buyer_identity_number`, `buyer_whatsapp`, `buyer_address` dan overload delapan parameter `etx_create_order` sudah ada.
4. Jika belum ada, jalankan file `supabase/migrations/202611250004_checkout_buyer_details.sql` satu kali.
5. Jalankan `supabase/migrations/202611250005_admin_decision_validation.sql` satu kali untuk hardening validasi keputusan admin.
6. Jalankan `supabase/migrations/202611250006_event_workflow_and_fixes.sql` satu kali (hak tabel organizer, moderasi event admin, perbaikan settlement, jadwal pg_cron). Jika notice menyatakan pg_cron tidak aktif, aktifkan di Database → Extensions lalu jalankan ulang bagian cron, atau jadwalkan `select public.etx_expire_pending_orders();` setiap menit.
7. Jangan menjalankan ulang migration 001, 002, atau 003 pada database existing.

## 3. Edge Function Secrets Supabase

Supabase Dashboard → Project Settings / Edge Functions → Secrets. Set nilai berikut:

| Name | Value |
|---|---|
| `MIDTRANS_SERVER_KEY` | Server Key Sandbox dari Midtrans |
| `MIDTRANS_SIGNATURE_SECRET_KEY` | Signature Secret Key Sandbox dari Midtrans |
| `MIDTRANS_IS_PRODUCTION` | `false` |
| `ETATIX_SITE_URL` | `https://etatix.my.id` |

Edge Functions juga memerlukan environment bawaan Supabase `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`. Pastikan tersedia secara otomatis/di konfigurasi project. Jangan pernah membagikan service role key.

## 4. Deploy Edge Functions

Pasang Supabase CLI dan login:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy etx-create-order
supabase functions deploy etx-midtrans-webhook --no-verify-jwt
supabase functions deploy etx-my-tickets
supabase functions deploy etx-checkin
```

Webhook harus dapat menerima POST publik dari Midtrans; validasi signature dilakukan di dalam function. Fungsi create-order tetap memerlukan autentikasi pengguna.

## 5. Vercel

1. Push folder project ini ke repository Git pribadi.
2. Vercel → Add New → Project → Import repository.
3. Framework preset: Next.js. Root Directory: `.` (folder `etatix_work` jika mengimpor repository induk).
4. Tambahkan environment variables untuk Production, Preview, dan Development sesuai kebutuhan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy.

## 6. Domain etatix.my.id

1. Vercel Project → Settings → Domains → Add `etatix.my.id`.
2. Ikuti record DNS yang ditampilkan Vercel untuk domain tersebut. Jangan menebak record; nilai dapat berbeda menurut konfigurasi project.
3. Atur domain utama ke `etatix.my.id`; tambahkan `www.etatix.my.id` hanya jika ingin menggunakannya dan atur redirect.
4. Tunggu status domain valid dan HTTPS aktif.
5. Pastikan `ETATIX_SITE_URL` di Supabase tetap `https://etatix.my.id`.

## 7. Supabase Auth URL Configuration

Authentication → URL Configuration:
- Site URL: `https://etatix.my.id`
- Redirect URLs: tambahkan URL callback yang benar-benar dipakai aplikasi (misalnya `https://etatix.my.id/**`).

Periksa juga template email Auth agar menggunakan domain publik yang benar.

## 8. Midtrans Sandbox Notification URL

Daftarkan Payment Notification URL di dashboard Midtrans Sandbox:

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/etx-midtrans-webhook`

Ganti `YOUR_PROJECT_REF` dengan project ref Supabase Anda. Jangan mendaftarkan URL website sebagai webhook; endpoint harus Edge Function tersebut.

## 9. Checklist uji sebelum publik

- [ ] Domain Vercel valid dan HTTPS aktif.
- [ ] Login dan registrasi dapat kembali ke halaman event.
- [ ] Event published dan jenis tiket aktif tampil.
- [ ] Form checkout meminta nama, jenis identitas, nomor identitas, email, WhatsApp, alamat, kategori, dan kuantitas.
- [ ] Harga/kuota divalidasi di database; jangan mempercayai nominal dari browser.
- [ ] Order tercipta dan redirect ke Midtrans Sandbox.
- [ ] Midtrans mengirim notifikasi ke Edge Function.
- [ ] Signature dan nominal diverifikasi.
- [ ] Status order berubah menjadi paid hanya setelah notifikasi valid.
- [ ] Tiket diterbitkan satu kali dan muncul di halaman Tiket Saya.
- [ ] Notifikasi duplikat tidak menerbitkan tiket ganda.
- [ ] Expired/deny/cancel melepaskan reservasi sesuai mekanisme database.
- [ ] RLS diuji untuk user, organizer, dan admin.

## Catatan keamanan

Nomor identitas dan alamat adalah data pribadi. Batasi akses tabel dan API, jangan tampilkan detail tersebut di halaman publik atau log, dan tentukan kebijakan retensi/penghapusan. Review RLS dan SECURITY DEFINER functions sebelum produksi.

## Penting

Paket ini merupakan source deployment candidate, bukan bukti bahwa deployment atau transaksi live telah berhasil. Build, konfigurasi akun, DNS, webhook, dan transaksi Sandbox harus diuji pada akun pemilik project sebelum membuka penjualan. Gunakan Sandbox sampai seluruh checklist lulus.
