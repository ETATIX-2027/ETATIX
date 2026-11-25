# ETATIX — Setup Supabase + Midtrans (sandbox terlebih dahulu)

## 1. Supabase project

**Penting untuk project ETATIX yang sudah memiliki database:** jangan ikuti langkah project kosong di bawah dan jangan jalankan migration 001–003 lagi. Gunakan panduan `DEPLOY-ETATIX-MY-ID.md` dan migration tambahan 004–006 setelah backup serta pemeriksaan skema.

### Hanya jika benar-benar membuat project Supabase baru yang kosong
1. Buat project Supabase dan simpan Project URL serta publishable/anon key.
2. Buka SQL Editor, jalankan migration secara berurutan:
   - `202611250001_etatix_core.sql`
   - `202611250002_organizer_admin.sql`
   - `202611250003_payments_payout_admin.sql`
   - `202611250004_checkout_buyer_details.sql`
   - `202611250005_admin_decision_validation.sql`
   - `202611250006_event_workflow_and_fixes.sql`
3. Pastikan semua query selesai tanpa error. Jangan menjalankan migration ulang sebagian secara manual.
4. Buat akun ETATIX pertama melalui halaman Register. Salin UUID dari Authentication → Users.
5. Tetapkan admin pertama lewat SQL Editor:
   `update public.etx_profiles set platform_role='admin' where id='UUID_USER_ADMIN';`
   Jalankan hanya untuk akun yang Anda kuasai.

## 2. Environment website
Salin `.env.example` ke `.env.local`, lalu isi:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Jangan pernah memasukkan service role key atau Midtrans Server Key ke variabel `NEXT_PUBLIC_*`.

## 3. Edge Function secrets
Set secrets pada Supabase:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIDTRANS_SERVER_KEY` (Sandbox Server Key)
- `MIDTRANS_SIGNATURE_SECRET_KEY` (Sandbox Signature Secret Key)
- `MIDTRANS_IS_PRODUCTION=false`
- `ETATIX_SITE_URL` (URL website ETATIX, untuk mengarahkan pembeli kembali ke halaman status pembayaran)

Deploy:
- `etx-create-order`
- `etx-my-tickets`
- `etx-checkin`
- `etx-midtrans-webhook`

Atur `ETATIX_SITE_URL` sebagai Edge Function secret di Supabase. Snap akan mengarahkan pembeli ke `/payment/result` setelah proses pembayaran selesai. Untuk webhook, set Payment Notification URL pada Midtrans Dashboard ke URL publik function `etx-midtrans-webhook`. Jangan gunakan localhost untuk pengujian notifikasi Midtrans; gunakan URL publik HTTPS.

## 4. Midtrans
- Mulai dari Sandbox.
- Gunakan Server Key untuk membuat Snap transaction.
- Gunakan Signature Secret Key untuk memverifikasi `signature_key` webhook (sejak 28 Okt 2026 kunci ini terpisah dari Server Key). Webhook juga menerima `MIDTRANS_SERVER_KEY` sebagai cadangan.
- Setelah lulus seluruh skenario sandbox, baru aktifkan production keys dan `MIDTRANS_IS_PRODUCTION=true`.

## 5. Status implementasi yang jujur
Migration 003 menambah struktur awal ledger, payout, pengaturan platform, dan audit log. Ini belum berarti alur payout bank sudah terhubung ke bank/disbursement provider. Dashboard laporan, manajemen payout admin, refund, email tiket, dan pengujian end-to-end masih perlu dikerjakan (scanner kamera dan penjadwalan expiry via pg_cron di migration 006 sudah tersedia, tetapi belum diuji di project Anda) sebelum menerima pembayaran nyata.

## 6. Catatan keamanan dan QA
- Uji settlement, pending, expire, deny, cancel, webhook duplikat, nominal tidak cocok, serta notifikasi tidak valid.
- Uji dua pembeli mengambil kuota terakhir secara bersamaan.
- Jangan mengaktifkan produksi sebelum RLS dan alur check-in diuji dengan akun customer, owner, manager, check-in staff, dan admin.
