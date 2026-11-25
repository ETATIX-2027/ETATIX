# Panduan deploy ETATIX ke Vercel (bahasa Indonesia)

> Lakukan deploy awal untuk staging/demo. Jangan menerima pembayaran sungguhan sebelum semua test sandbox dan audit keamanan selesai.

## A. Persiapan
1. Ekstrak folder `ETATIX_REBUILD` dari ZIP.
2. Buat repository GitHub baru bernama `etatix-platform` dan upload seluruh isi folder (termasuk `package.json`, `app/`, `lib/`, `components/`, dan `supabase/`).
3. Pastikan file `.env.local` TIDAK diunggah. `.env.example` boleh diunggah karena hanya berisi placeholder.

## B. Import ke Vercel
1. Login ke Vercel menggunakan akun GitHub.
2. Pilih **Add New → Project**, lalu import repository `etatix-platform`.
3. Framework preset: Next.js. Root Directory: `./` jika `package.json` berada di root repository.
4. Sebelum deploy, isi Environment Variables berikut:

| Name | Value | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase | URL project ETATIX |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key / anon key | Boleh digunakan di browser dengan RLS aktif |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Rahasia server; jangan pernah beri awalan NEXT_PUBLIC_ |
| `MIDTRANS_SERVER_KEY` | Server Key Midtrans | Gunakan Sandbox saat pengujian |
| `MIDTRANS_SIGNATURE_SECRET_KEY` | Signature Key Midtrans | Rahasia webhook |
| `MIDTRANS_IS_PRODUCTION` | `false` | Sandbox; ubah hanya setelah persetujuan launching |

5. Klik **Deploy**. Tunggu build selesai. Jika gagal, buka Build Logs dan perbaiki error pertama yang muncul.

## C. Setelah deploy
1. Buka domain Vercel hasil deploy dan uji halaman `/`, `/register`, `/login`, `/events`, `/my-tickets`, `/organizer`, `/organizer/scanner`, dan `/admin`.
2. Pastikan Supabase Auth → URL Configuration menambahkan domain Vercel ke **Site URL** dan **Redirect URLs** (contoh `https://DOMAIN-ANDA.vercel.app/**`).
3. Deploy Edge Functions dari folder `supabase/functions/` menggunakan Supabase CLI. Deploy fungsi: `etx-create-order`, `etx-midtrans-webhook`, `etx-my-tickets`, `etx-checkin`.
4. Set secrets di Supabase Edge Functions sesuai nama yang dibaca masing-masing fungsi. Periksa source code fungsi terlebih dahulu; jangan menebak nama secret.
5. Di dashboard Midtrans Sandbox, set Payment Notification URL ke `https://PROJECT_REF.supabase.co/functions/v1/etx-midtrans-webhook`.
6. Uji pembayaran dengan akun dan metode Sandbox. Pastikan webhook mengubah order menjadi paid dan menerbitkan tiket tepat satu kali.

## D. Pemeriksaan sebelum produksi
- Uji RLS dengan customer, owner/manager organizer, check-in staff, dan admin.
- Uji QR valid, QR tidak dikenal, QR tiket batal/refund, dan QR yang sudah check-in.
- Uji webhook duplikat, signature salah, pembayaran pending, settlement, expire, dan deny.
- Pastikan tidak ada service role key, Midtrans Server Key, atau Signature Key di bundle browser, GitHub, atau screenshot publik.
- Siapkan kebijakan refund, privasi, syarat layanan, dukungan pelanggan, monitoring, backup, dan prosedur payout manual.
- Payout bank otomatis belum diimplementasikan. Tabel payout saat ini hanya fondasi permintaan dan pencatatan; jangan menjanjikan transfer otomatis.

## Batasan versi ini
Paket ini adalah fondasi aplikasi dan UI awal, bukan produk produksi yang sudah lulus QA. Dashboard admin saat ini terutama menangani review pengajuan organizer; dashboard finansial penuh, moderasi event lengkap, refund, laporan komprehensif, dan disbursement payout otomatis masih perlu dibangun dan diuji.
