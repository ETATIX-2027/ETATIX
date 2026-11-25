# ETATIX — Paket Source untuk GitHub

Folder ini adalah source proyek ETATIX yang diekstrak dari ZIP yang diberikan.

## Upload ke GitHub
1. Buat repository baru bernama `etatix` (Private disarankan).
2. Ekstrak ZIP ini.
3. Buka folder `etatix`.
4. Upload ISI folder `etatix` ke halaman repository GitHub (bukan folder pembungkus `etatix_github_ready`).
5. Pastikan `.env.local`, token, password, dan kredensial rahasia tidak diunggah.

## Struktur proyek
- `app/` — halaman dan route Next.js.
- `components/` — komponen antarmuka.
- `lib/` — helper dan koneksi Supabase.
- `public/` — aset publik.
- `supabase/functions/` — empat Edge Functions ETATIX.
- `legacy-reference/` — dua file HTML referensi lama.
- `supabase/migrations/` — file SQL referensi proyek. Jangan jalankan file ini tanpa persetujuan eksplisit.

## Catatan penting
Paket ini mempertahankan source proyek yang diterima; ini bukan hasil build atau bukti deployment.
Belum ada kredensial rahasia di dalam paket. Konfigurasi rahasia dilakukan melalui dashboard layanan hosting.
Jangan jalankan SQL, migrasi, atau `supabase db push` sebagai bagian dari upload GitHub.
