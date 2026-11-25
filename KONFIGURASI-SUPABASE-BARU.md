# Konfigurasi Supabase ETATIX — Project Baru

Project URL: https://vnlmfkqabjoukigslniq.supabase.co

Publishable key hanya tersimpan di `legacy-reference/*.html` (referensi lama); ZIP ini **tidak** menyertakan `.env.local` — buat sendiri dari `.env.example`. Publishable key memang boleh digunakan di browser. **Jangan pernah menaruh `service_role` key atau secret Midtrans di HTML/browser.**

## Sebelum menjalankan aplikasi

1. Buka Supabase Dashboard untuk project di atas.
2. Masuk ke **SQL Editor**.
3. Jalankan file migration secara berurutan, satu per satu:
   - `supabase/migrations/202611250001_etatix_core.sql`
   - `supabase/migrations/202611250002_organizer_admin.sql`
   - `supabase/migrations/202611250003_payments_payout_admin.sql`
   - `supabase/migrations/202611250004_checkout_buyer_details.sql`
   - `supabase/migrations/202611250005_admin_decision_validation.sql`
   - `supabase/migrations/202611250006_event_workflow_and_fixes.sql`
4. Buat akun pertama melalui halaman `/register` setelah aplikasi dijalankan.
5. Tetapkan akun Super Admin pertama mengikuti langkah bootstrap di `README.md` dan `MIDTRANS-SETUP-ID.md`. UUID harus milik akun yang benar-benar Anda kuasai.
6. Untuk pembayaran, deploy Edge Functions dan isi secrets server sesuai `MIDTRANS-SETUP-ID.md`. Tanpa konfigurasi Midtrans, pembayaran nyata belum aktif.

## Menjalankan aplikasi Next.js

- Gunakan Node.js 20 atau lebih baru.
- Salin `.env.example` menjadi `.env.local` lalu isi URL dan publishable key project Anda.
- Jalankan `npm install`, lalu `npm run dev`.
- Buka `http://localhost:3000`.

## Catatan kompatibilitas

Folder `legacy-reference/` dipertahankan sebagai referensi/versi kompatibilitas lama. Aplikasi utama yang dituju untuk project baru adalah Next.js (`app/`). Jangan menganggap file HTML lama sebagai pengganti semua halaman Next.js atau sebagai bukti bahwa seluruh alur transaksi telah diuji. Struktur tabel dari CSV sebelumnya berasal dari skema ETATIX lama dan tidak identik dengan skema migration baru pada paket ini. Karena project pada screenshot menunjukkan belum ada migration, migration dalam paket ini menyiapkan skema aplikasi baru. Jalankan hanya pada project baru yang kosong ini; jangan jalankan pada database berisi data tanpa audit dan backup.

## Status

Saya tidak dapat masuk ke dashboard Supabase Anda untuk menjalankan SQL, membuat akun admin, mengisi secrets, atau melakukan uji transaksi. Karena itu paket belum dapat dinyatakan live/production-ready sampai langkah-langkah di atas diselesaikan dan diuji.
