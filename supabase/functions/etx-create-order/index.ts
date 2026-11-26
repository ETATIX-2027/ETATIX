import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
  const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true';
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !serverKey) {
    return reply({ error: 'PAYMENT_CONFIGURATION_MISSING' }, 503);
  }
  const authorization = req.headers.get('Authorization');
  if (!authorization) return reply({ error: 'AUTH_REQUIRED' }, 401);

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return reply({ error: 'INVALID_SESSION' }, 401);

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return reply({ error: 'INVALID_ORDER_INPUT' }, 400);
    }
    const input = body as Record<string, unknown>;
    const quantity = Number(input.quantity);
    if (
      typeof input.ticket_type_id !== 'string' ||
      !input.ticket_type_id.trim() ||
      typeof input.buyer_name !== 'string' ||
      input.buyer_name.trim().length < 2 ||
      typeof input.buyer_email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.buyer_email.trim()) ||
      typeof input.buyer_identity_type !== 'string' ||
      !['KTP', 'SIM', 'PASPOR', 'KARTU_PELAJAR', 'LAINNYA'].includes(input.buyer_identity_type) ||
      typeof input.buyer_identity_number !== 'string' || input.buyer_identity_number.trim().length < 4 ||
      typeof input.buyer_whatsapp !== 'string' || input.buyer_whatsapp.replace(/[^0-9]/g, '').length < 9 ||
      typeof input.buyer_address !== 'string' || input.buyer_address.trim().length < 8 ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 20
    ) {
      return reply({ error: 'INVALID_ORDER_INPUT' }, 400);
    }
    const { data: created, error: orderError } = await userClient.rpc('etx_create_order', {
      p_ticket_type_id: input.ticket_type_id,
      p_quantity: quantity,
      p_buyer_name: input.buyer_name.trim(),
      p_buyer_email: input.buyer_email.trim().toLowerCase(),
      p_buyer_identity_type: input.buyer_identity_type,
      p_buyer_identity_number: input.buyer_identity_number.trim(),
      p_buyer_whatsapp: input.buyer_whatsapp.trim(),
      p_buyer_address: input.buyer_address.trim(),
    });
    if (orderError) return reply({ error: orderError.message }, 400);
    const order = created?.[0];
    if (!order?.order_id || !order?.order_number) return reply({ error: 'ORDER_CREATION_FAILED' }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const grossAmount = Math.round(Number(order.amount));
    if (!Number.isSafeInteger(grossAmount) || grossAmount < 1) return reply({ error: 'INVALID_ORDER_AMOUNT' }, 400);

    const endpoint = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    const midtransResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${serverKey}:`)}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: order.order_number, gross_amount: grossAmount },
        customer_details: {
          first_name: input.buyer_name.trim().slice(0, 50),
          email: input.buyer_email.trim().toLowerCase().slice(0, 100),
          phone: String(input.buyer_whatsapp).trim().slice(0, 20),
          billing_address: { address: String(input.buyer_address).trim().slice(0, 200) },
        },
        ...(Deno.env.get('ETATIX_SITE_URL') ? {
          callbacks: {
            finish: `${Deno.env.get('ETATIX_SITE_URL')!.replace(/\/$/, '')}/payment/result?order=${encodeURIComponent(order.order_number)}`,
          },
        } : {}),
        expiry: { unit: 'minute', duration: 15 },
      }),
    });
    const snap = await midtransResponse.json();
    if (!midtransResponse.ok || !snap.token || !snap.redirect_url) {
      // Jangan membocorkan respons mentah Midtrans ke browser; simpan di log server saja.
      console.error('Midtrans create transaction failed', midtransResponse.status, JSON.stringify(snap));
      // Lepas stok segera agar tidak tertahan sampai batas waktu 15 menit.
      await admin.rpc('etx_update_order_payment_status', { p_order_id: order.order_id, p_status: 'failed', p_payload: {} });
      return reply({ error: 'MIDTRANS_CREATE_TRANSACTION_FAILED' }, 502);
    }

    const { error: paymentError } = await admin.from('etx_payments').insert({
      order_id: order.order_id,
      provider: 'midtrans',
      provider_reference: order.order_number,
      amount: grossAmount,
      status: 'pending',
      snap_token: snap.token,
      redirect_url: snap.redirect_url,
      raw_response: snap,
    });
    if (paymentError) {
      console.error('etx_payments insert failed', paymentError.message);
      await admin.rpc('etx_update_order_payment_status', { p_order_id: order.order_id, p_status: 'failed', p_payload: {} });
      return reply({ error: 'PAYMENT_RECORD_FAILED' }, 500);
    }
    return reply({ success: true, order: { id: order.order_id, number: order.order_number, amount: grossAmount, expires_at: order.expires_at }, payment: { provider: 'midtrans', token: snap.token, redirect_url: snap.redirect_url } }, 201);
  } catch (error) {
    console.error('etx-create-order failed', error);
    return reply({ error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
