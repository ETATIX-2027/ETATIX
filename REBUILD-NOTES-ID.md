# Catatan rebuild ETATIX

## Apa yang berubah dari versi ZIP
1. Arah arsitektur diubah dari dua file HTML dengan dashboard owner tunggal menjadi Next.js App Router.
2. Database baru dirancang untuk beberapa organizer dan anggota tim per organizer.
3. Data profil, organizer, event, kategori tiket, order, item order, pembayaran, tiket terbit, dan webhook dibuat eksplisit dalam migration.
4. Pembuatan order dan reservasi kuota dibuat atomik di PostgreSQL agar dua pembeli tidak mengambil stok terakhir secara bersamaan.
5. Pembayaran tidak dianggap berhasil dari browser. Fungsi penanda lunas hanya diberi hak execute untuk service role.
6. Check-in dilakukan melalui RPC yang memeriksa keanggotaan staff pada organizer pemilik event dan menolak tiket yang telah digunakan.
7. RLS membatasi profil, order, pembayaran, dan tiket ke pemilik data; event publik hanya membaca status published.

## Temuan dari arsip asli
- ZIP berisi `index.html`, `admin.html`, dua file SQL, satu Edge Function `etx-my-tickets`, dan satu file `index.ts`.
- README asli menyatakan skema dasar tabel ETATIX tidak disertakan.
- README asli menyatakan fungsi `etx-create-order` dipanggil frontend tetapi tidak ada dalam ZIP.
- Payment gateway dan webhook belum dikonfigurasi menurut README/checklist asli.
- SQL owner lama mengelola akses pemilik tunggal, bukan alur organizer mandiri.
- File lama dipertahankan di `legacy-reference/` untuk rujukan, bukan dipakai sebagai runtime baru.

## Yang masih perlu dikerjakan berikutnya
1. Organizer onboarding + admin approval dan pembuatan organizer/member secara aman.
2. Dashboard organizer (CRUD event/ticket, tim, statistik, peserta).
3. Checkout Midtrans: create transaction server-side, webhook signature verification, idempotency, dan reconciliation.
4. Ticket wallet dengan QR yang berisi token opaque; hindari mengekspos data pribadi pada QR.
5. Kamera scanner PWA dan log check-in.
6. Super admin, moderasi event, fee config, refund, payout, dan audit log.
7. Job untuk melepaskan reservasi order expired.
8. Test otomatis RLS, concurrency stok, webhook duplikat, dan check-in ganda.

## Rebuild lanjutan — onboarding organizer + admin
- Ditambahkan halaman `/organizer/apply` untuk mengirim permohonan organizer dengan status pending.
- Ditambahkan `/organizer` untuk melihat keanggotaan organizer dan membuat event draft melalui RLS.
- Ditambahkan `/admin` untuk membaca antrean pengajuan dan approve/reject menggunakan RPC SECURITY DEFINER yang memeriksa platform_role admin.
- Approval organizer membuat organizer dan membership owner dalam satu transaksi.
- Ditambahkan trigger proteksi agar user tidak dapat menaikkan role profilnya sendiri.
- Dashboard akun kini menautkan modul organizer dan super admin.
- Tetap perlu verifikasi build, migrasi pada project Supabase staging, dan pengujian akun customer/organizer/admin sebelum produksi.
- Ditambahkan registrasi akun Supabase Auth di `/register` agar user baru dapat mendaftar sebelum mengajukan organizer.
- Ditambahkan `/my-tickets` untuk melihat tiket yang diterbitkan; halaman menampilkan kode tiket dan status, belum QR visual.

## Pembaruan lanjutan: QR wallet + scanner
- Wallet `/my-tickets` kini menampilkan QR dari `ticket_code` menggunakan `qrcode.react`.
- Ditambahkan `/organizer/scanner` dengan kamera via BarcodeDetector browser dan input kode manual.
- Halaman scanner memanggil Edge Function `etx-checkin`; validasi role organizer dan status tiket tetap ditegakkan oleh RPC `etx_checkin_ticket`.
- Kompatibilitas kamera bergantung pada dukungan BarcodeDetector browser; input manual tersedia sebagai fallback.
