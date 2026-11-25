# ETATIX — Platform Tiket Event (Next.js 15 + Supabase + Midtrans)

Marketplace tiket multi-organizer: katalog event, checkout Midtrans Snap, e-ticket QR, scanner check-in, dashboard organizer, dan panel Super Admin.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Supabase (Auth, Postgres + RLS, Edge Functions/Deno) · Midtrans Snap.

## Struktur
| Path | Fungsi |
|---|---|
| `app/` | Halaman: `/`, `/events`, `/events/[slug]`, `/login`, `/register`, `/dashboard`, `/my-tickets`, `/payment/result`, `/organizer`, `/organizer/apply`, `/organizer/scanner`, `/admin` |
| `lib/` | Klien Supabase (browser/server) + `function-error.ts` (pesan error Edge Function) |
| `middleware.ts` | Menyegarkan sesi Supabase untuk halaman yang butuh login |
| `supabase/migrations/` | Skema database — **001 → 006 berurutan** |
| `supabase/functions/` | Edge Functions: `etx-create-order`, `etx-midtrans-webhook`, `etx-checkin`, `etx-my-tickets` |
| `legacy-reference/` | HTML versi lama, hanya referensi (bukan bagian aplikasi aktif) |

## 1. Menjalankan secara lokal
Butuh Node.js 20+.
```bash
npm install
cp .env.example .env.local     # isi URL & publishable/anon key Supabase
npm run dev                    # http://localhost:3000
```
Pemeriksaan kualitas: `npm run typecheck`, `npm run lint`, `npm run build`.
> Tanpa `.env.local`, halaman statis tetap tampil, tetapi katalog/login/checkout menampilkan pesan "belum terhubung".

## 2. Database Supabase (project KOSONG)
SQL Editor → jalankan satu per satu, berurutan:
`202611250001` → `002` → `003` → `004` → `005` → `006`.
Untuk database yang sudah berisi: backup dulu, lalu hanya jalankan migration yang belum pernah diterapkan (001–003 jangan diulang; lihat `DEPLOY-ETATIX-MY-ID.md`).

Migration 006 mengaktifkan pg_cron untuk melepas stok pesanan kedaluwarsa tiap menit. Bila ekstensi tidak bisa diaktifkan otomatis, aktifkan di *Database → Extensions* atau jadwalkan `select public.etx_expire_pending_orders();` setiap menit.

**Admin pertama:** daftar lewat `/register`, salin UUID di *Authentication → Users*, lalu di SQL Editor:
```sql
update public.etx_profiles set platform_role = 'admin' where id = 'UUID_AKUN_ANDA';
```

## 3. Edge Functions & Midtrans (Sandbox dulu)
Secrets (Supabase → Edge Functions → Secrets): `MIDTRANS_SERVER_KEY`, `MIDTRANS_SIGNATURE_SECRET_KEY`, `MIDTRANS_IS_PRODUCTION=false`, `ETATIX_SITE_URL`. (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` disediakan otomatis.)
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy etx-create-order
supabase functions deploy etx-my-tickets
supabase functions deploy etx-checkin
supabase functions deploy etx-midtrans-webhook --no-verify-jwt
```
Set *Payment Notification URL* di Midtrans ke `https://<project-ref>.supabase.co/functions/v1/etx-midtrans-webhook`. Detail: `MIDTRANS-SETUP-ID.md`, deploy Vercel: `DEPLOY-VERCEL-ID.md`, `DEPLOY-ETATIX-MY-ID.md`.

## 4. Alur penggunaan
1. Pengguna `/register` → `/organizer/apply` → admin menyetujui di `/admin`.
2. Organizer: `/organizer` → buat event (draft) → **+ Kategori tiket** → **Ajukan review**.
3. Admin: `/admin` → **Setujui & tayangkan** → event muncul di `/events`.
4. Pembeli: pilih tiket → isi data → bayar via Midtrans → webhook menerbitkan tiket → `/my-tickets` (QR).
5. Staf: `/organizer/scanner` (HTTPS/localhost + izin kamera) memindai QR atau input kode manual.

## Batasan yang diketahui (belum selesai, bukan bug)
Payout/refund, laporan penjualan, email/WhatsApp tiket, edit event lengkap & upload cover, serta homepage yang masih memakai kartu contoh statis. **Jangan menerima pembayaran nyata sebelum seluruh alur diuji end-to-end di Sandbox.**

## Keamanan
Jangan memasukkan service role key / secret Midtrans ke browser, Git, atau variabel `NEXT_PUBLIC_*`. ZIP ini tidak berisi secret. Lihat `AUDIT-REPORT-ID.md`.


## Header bersama
Seluruh route memakai `components/site-header.tsx` melalui `app/layout.tsx`. Desainnya mengikuti header pada `legacy-reference/index-v1.html` karena tidak ada `index.html` aktif di root project. Logo diambil dari `public/logo.svg`.
