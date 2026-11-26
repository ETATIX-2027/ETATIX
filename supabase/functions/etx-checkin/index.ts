
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');

  if (!url || !anon) {
    return reply({ error: 'SERVER_CONFIGURATION_ERROR' }, 500);
  }

  const auth = req.headers.get('Authorization');

  if (!auth) {
    return reply({ error: 'AUTH_REQUIRED' }, 401);
  }

  try {
    const sb = createClient(url, anon, {
      global: {
        headers: {
          Authorization: auth,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser();

    if (authError || !user) {
      return reply({ error: 'INVALID_SESSION' }, 401);
    }

    const body: unknown = await req.json();

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return reply({ error: 'INVALID_TICKET_CODE' }, 400);
    }

    const ticketCode = (
      body as Record<string, unknown>
    ).ticket_code;

    if (
      typeof ticketCode !== 'string' ||
      ticketCode.trim().length < 8 ||
      ticketCode.trim().length > 128
    ) {
      return reply({ error: 'INVALID_TICKET_CODE' }, 400);
    }

    const { data, error } = await sb.rpc(
      'etx_checkin_ticket',
      {
        p_ticket_code: ticketCode.trim().toUpperCase(),
      },
    );

    if (error) {
      console.error('Check-in RPC error:', error.message);
      return reply({ error: error.message }, 403);
    }

    return reply({
      result: data?.[0] || null,
    });
  } catch (e) {
    console.error('Check-in error:', e);

    return reply(
      { error: 'INTERNAL_SERVER_ERROR' },
      500,
    );
  }
});
