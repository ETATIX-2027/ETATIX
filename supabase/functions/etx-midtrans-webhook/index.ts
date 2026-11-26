import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const sha512 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-512', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // Sejak 28 Okt 2026 Midtrans memverifikasi notifikasi dengan Signature Secret Key (terpisah dari Server Key).
  // MIDTRANS_SERVER_KEY diterima sebagai cadangan untuk akun yang belum bermigrasi / sandbox lama.
  const secrets = [Deno.env.get('MIDTRANS_SIGNATURE_SECRET_KEY'), Deno.env.get('MIDTRANS_SERVER_KEY')]
    .filter((v): v is string => !!v);
  if (!url || !serviceRoleKey || !secrets.length) return json({ error: 'WEBHOOK_CONFIGURATION_MISSING' }, 503);

  try {
    const payload: unknown = await req.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ error: 'INVALID_NOTIFICATION' }, 400);
    }
    const { order_id, status_code, gross_amount, signature_key, transaction_status, transaction_id, fraud_status, payment_type } = payload as Record<string, unknown>;
    if (
      typeof order_id !== 'string' || !order_id.trim() ||
      (typeof status_code !== 'string' && typeof status_code !== 'number') ||
      (typeof gross_amount !== 'string' && typeof gross_amount !== 'number') ||
      typeof signature_key !== 'string' || !/^[a-f0-9]{128}$/i.test(signature_key) ||
      typeof transaction_status !== 'string' || !transaction_status.trim()
    ) {
      return json({ error: 'INVALID_NOTIFICATION' }, 400);
    }
    let signatureValid = false;
    for (const secret of secrets) {
      const expected = await sha512(`${order_id}${status_code}${gross_amount}${secret}`);
      if (expected.toLowerCase() === String(signature_key).toLowerCase()) { signatureValid = true; break; }
    }
    if (!signatureValid) return json({ error: 'INVALID_SIGNATURE' }, 401);

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const { data: payment, error: lookupError } = await admin.from('etx_payments')
      .select('id,order_id,amount,provider_reference')
      .eq('provider', 'midtrans').eq('provider_reference', order_id).maybeSingle();
    if (lookupError || !payment) return json({ error: 'PAYMENT_NOT_FOUND' }, 404);
    if (Math.round(Number(payment.amount)) !== Math.round(Number(gross_amount))) return json({ error: 'AMOUNT_MISMATCH' }, 400);

    const eventKey = `${order_id}:${transaction_id ?? 'no-tx'}:${transaction_status}:${status_code}`;
    const { error: eventInsertError } = await admin.from('etx_webhook_events').insert({
      provider: 'midtrans', provider_event_id: eventKey, payload,
    });
    if (eventInsertError?.code === '23505') return json({ success: true, duplicate: true });
    if (eventInsertError) return json({ error: 'WEBHOOK_LOG_FAILED' }, 500);

    const isSuccessfulStatus = transaction_status === 'settlement' || transaction_status === 'capture';
    if (isSuccessfulStatus && (String(status_code) !== '200' || (fraud_status && fraud_status !== 'accept'))) {
      await admin.from('etx_webhook_events').delete().eq('provider', 'midtrans').eq('provider_event_id', eventKey);
      return json({ error: 'PAYMENT_NOT_CONFIRMED' }, 400);
    }

    if (isSuccessfulStatus) {
      const { error } = await admin.rpc('etx_mark_order_paid', {
        p_order_id: payment.order_id,
        p_provider: 'midtrans',
        p_provider_reference: transaction_id ?? order_id,
        p_payload: payload,
      });
      if (error) {
        await admin.from('etx_webhook_events').delete().eq('provider', 'midtrans').eq('provider_event_id', eventKey);
        return json({ error: 'ORDER_SETTLEMENT_FAILED' }, 500);
      }
    } else {
      const status = transaction_status === 'expire' ? 'expired'
        : transaction_status === 'deny' || transaction_status === 'cancel' ? 'failed'
        : 'pending';
      const { error } = await admin.rpc('etx_update_order_payment_status', {
        p_order_id: payment.order_id, p_status: status, p_payload: payload,
      });
      if (error) {
        await admin.from('etx_webhook_events').delete().eq('provider', 'midtrans').eq('provider_event_id', eventKey);
        return json({ error: 'PAYMENT_STATUS_UPDATE_FAILED' }, 500);
      }
    }

    await admin.from('etx_payments').update({
      provider_transaction_id: transaction_id ?? null,
      payment_type: payment_type ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', payment.id);
    await admin.from('etx_webhook_events').update({ processed_at: new Date().toISOString() })
      .eq('provider', 'midtrans').eq('provider_event_id', eventKey);
    return json({ success: true });
  } catch (error) {
    console.error('etx-midtrans-webhook failed', error);
    return json({ error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
