# Laporan Audit ETATIX — 25 November 2026

## Teknologi
Next.js 15 (App Router) + React 19 + TypeScript, Supabase (Auth/Postgres RLS/Edge Functions Deno), Midtrans Snap, qrcode.react. 6 migration SQL, 4 Edge Function.

## Batas pengujian (jujur)
Sandbox tidak punya akses jaringan: `npm install` tidak dapat mengunduh paket, serta tidak ada Postgres/Deno. Maka **`npm run build`, `lint`, server dev, uji browser, uji database, dan uji Midtrans TIDAK dijalankan**. Yang dijalankan: parsing sintaks seluruh 24 file TS/TSX (0 error), pengecekan semua import lokal (semua ada), pengecekan keseimbangan tanda kurung/`$$` pada 6 migration SQL, pemindaian secret, dan verifikasi dokumentasi Midtrans via web. Type-check penuh dan semua uji fungsional harus dijalankan di mesin Anda.

## Masalah ditemukan → perbaikan
| # | Masalah | Dampak | Perbaikan |
|---|---|---|---|
| 1 | Role `authenticated` tidak punya GRANT insert/update pada `etx_events` & `etx_ticket_types` | Organizer tidak bisa membuat event/tiket (permission denied) | Migration 006 (grant per kolom) |
| 2 | Tidak ada jalur menerbitkan event (`published`) maupun UI kategori tiket | Katalog selalu kosong; tidak ada tiket dijual | RPC admin + UI organizer & admin |
| 3 | Settlement menolak pembayaran jika tiba setelah `expires_at` | Pembeli sudah bayar tapi tiket tak terbit; webhook gagal berulang | `etx_mark_order_paid` baru: reservasi ulang stok bila order `expired` |
| 4 | Job `etx_expire_pending_orders` tidak pernah dijadwalkan | Stok tertahan selamanya | pg_cron di migration 006 |
| 5 | Error Edge Function (non-2xx) tampil generik "non-2xx" | Pembeli/staf tak tahu penyebab | `lib/function-error.ts`, dipakai checkout & scanner |
| 6 | `.event-panel` hanya didefinisikan inline di halaman detail event | `/payment/result` tampil tanpa gaya | Dipindah ke `globals.css` |
| 7 | Tidak ada `middleware.ts` padahal helper server mengandalkannya | Sesi server bisa kedaluwarsa → redirect `/login` acak | `middleware.ts` |
| 8 | `etx-create-order` mengirim respons mentah Midtrans ke browser & menahan stok saat gagal | Kebocoran detail, stok tertahan 15 menit | Log di server, stok langsung dilepas |
| 9 | Webhook hanya menerima Signature Secret Key | Gagal bila akun masih memakai Server Key | Terima keduanya (Signature Secret diprioritaskan) |
| 10 | `@eslint/eslintrc` tidak ada di devDependencies | `npm run lint` gagal | Ditambahkan (+ `@types/react-dom`) |
| 11 | Insert aplikasi organizer boleh mengisi `reviewed_by/at` | Pemohon bisa memalsukan metadata review | Grant kolom terbatas |
| 12 | Pesan duplikat pengajuan organizer berupa error SQL mentah | UX buruk | Pesan Indonesia |
| 13 | `dashboard` redirect ke `/login` tanpa `next` | Setelah login tak kembali | `?next=/dashboard` |

## File dihapus / dibuat
- Dihapus: `index.html`, `admin.html` (identik byte-per-byte dengan `legacy-reference/`, tidak dipakai Next.js); `tsconfig.tsbuildinfo` (artefak build 114 KB); `UPGRADE-REPORT-ID.md` (klaim usang); dependency tak terpakai `lucide-react`.
- Dipindah: `public-logo.svg` → `public/logo.svg` (kini dipakai sebagai ikon situs).
- Dibuat: `middleware.ts`, `lib/function-error.ts`, `supabase/migrations/202611250006_event_workflow_and_fixes.sql`, `AUDIT-REPORT-ID.md`; `README.md` ditulis ulang.
- Diubah: `package.json`, `.gitignore`, `app/layout.tsx`, `app/globals.css`, `app/dashboard`, `app/events/[slug]` (page & checkout), `app/organizer` (page, apply, scanner), `app/admin`, `etx-create-order`, `etx-midtrans-webhook`, 3 dokumen setup.

## Keamanan
Tidak ditemukan secret (service role/server key). Yang ada hanya project URL dan *publishable key* di `legacy-reference/*.html` dan `KONFIGURASI-SUPABASE-BARU.md` — kunci ini memang publik, tetapi pastikan RLS aktif (sudah, di migration 001). Tidak ada `package-lock.json` karena tak bisa dibuat offline; `npm install` akan membuatnya.

## Masih butuh tindakan Anda
Menjalankan migration 001–006, mengisi `.env.local`, secrets & deploy Edge Functions, bootstrap admin, uji Sandbox Midtrans end-to-end (termasuk webhook, pembayaran kedaluwarsa, check-in ganda), serta `npm run build`. Fitur belum ada: payout, refund, laporan, email tiket, edit event penuh/upload cover.


## Audit lanjutan — penyatuan header (25 November 2026)

- ZIP yang diterima tidak memiliki `index.html` di root. Acuan desain yang tersedia adalah `legacy-reference/index-v1.html`; file tersebut berada di folder arsip referensi dan bukan runtime Next.js.
- Header master kini disediakan oleh `components/site-header.tsx` dan dipasang satu kali melalui `app/layout.tsx`, sehingga mencakup seluruh route App Router.
- Struktur visual mengacu pada header referensi: latar biru `#12337D`, logo `public/logo.svg` ukuran 42 px (38 px pada layar kecil), identitas ETATIX/TIX, kontrol bahasa ID, tombol pencarian, menu dropdown, serta navigasi bawah fixed.
- Navigasi bawah menautkan Beranda, Jelajah, dan Tiket Saya. Menu dropdown menyediakan tautan ke route utama aplikasi.
- Pencarian header membuka input dan meneruskan query ke `/events?search=...`; katalog melakukan pencarian judul event.
- Masthead/brand link lokal dan pemanggilan `SiteHeader` per halaman dihapus agar tidak terjadi header ganda.
- CSS header diisolasi dengan prefiks `site-` untuk mengurangi benturan dengan gaya halaman lama.

### Validasi lanjutan
- Pemeriksaan statis dilakukan pada struktur file dan perubahan referensi komponen.
- Build Next.js, lint, typecheck penuh, browser test, console test, dan pemeriksaan viewport nyata belum dapat diklaim lulus karena dependensi belum diinstal dan layanan Supabase/Midtrans tidak tersedia di lingkungan audit. Jalankan `npm install`, `npm run typecheck`, `npm run lint`, dan `npm run build` sebelum deploy.
- `legacy-reference/index-v1.html` tetap dipertahankan tanpa perubahan; aplikasi aktif menggunakan Next.js App Router.
