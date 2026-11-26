// Menerjemahkan kode error dari Edge Function / RPC Supabase menjadi pesan Indonesia.
// supabase.functions.invoke() hanya memberi pesan generik untuk respons non-2xx,
// sehingga isi JSON asli dibaca dari error.context (objek Response).
const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Silakan masuk terlebih dahulu.',
  INVALID_SESSION: 'Sesi login tidak valid. Silakan masuk kembali.',
  INVALID_ORDER_INPUT: 'Data pemesanan tidak valid. Periksa kembali isian Anda.',
  INVALID_BUYER_DETAILS: 'Data pemesan tidak lengkap atau tidak valid.',
  INVALID_QUANTITY: 'Jumlah tiket tidak valid (1–20 tiket).',
  INSUFFICIENT_STOCK: 'Stok tiket tidak mencukupi. Kurangi jumlah atau pilih kategori lain.',
  TICKET_NOT_AVAILABLE: 'Kategori tiket ini tidak tersedia.',
  EVENT_NOT_AVAILABLE: 'Event ini belum dibuka untuk penjualan.',
  SALES_CLOSED: 'Penjualan tiket untuk kategori ini sedang tidak dibuka.',
  PAYMENT_CONFIGURATION_MISSING: 'Layanan pembayaran belum dikonfigurasi oleh penyelenggara platform.',
  MIDTRANS_CREATE_TRANSACTION_FAILED: 'Gagal membuat transaksi pembayaran. Silakan coba lagi.',
  PAYMENT_RECORD_FAILED: 'Pembayaran gagal dicatat. Silakan coba lagi.',
  INVALID_ORDER_AMOUNT: 'Nominal pesanan tidak valid.',
  ORDER_CREATION_FAILED: 'Pesanan gagal dibuat. Silakan coba lagi.',
  INTERNAL_SERVER_ERROR: 'Terjadi kesalahan pada server. Silakan coba lagi.',
  INVALID_TICKET_CODE: 'Kode tiket tidak valid.',
  NOT_EVENT_STAFF: 'Akun Anda bukan staf event ini, sehingga tidak dapat melakukan check-in.',
  CHECK_IN_SUCCESS: 'Check-in berhasil.',
  TICKET_NOT_FOUND: 'Tiket tidak ditemukan.',
  TICKET_ALREADY_USED_OR_INVALID: 'Tiket sudah digunakan atau tidak valid.',
};

export function translateCode(code: string): string {
  return MESSAGES[code] ?? code;
}

export async function readFunctionError(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (typeof Response !== 'undefined' && context instanceof Response) {
    try {
      const body: unknown = await context.clone().json();
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        const code = record.error ?? record.message;
        if (typeof code === 'string' && code) return translateCode(code);
      }
    } catch { /* isi respons bukan JSON; gunakan pesan cadangan */ }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
