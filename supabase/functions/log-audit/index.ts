import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch {}

    const body = await req.json().catch(() => ({}));

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (body.action === 'list' || req.method === 'GET') {
      const { data: events, error } = await adminClient
        .from('audit_events')
        .select('id, actor_id, entity_type, entity_id, action, details, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, events: events || [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { section, itemId, action, itemLabel, details, user_id, actor_id } = body;
    const resolvedActorId = user?.id || actor_id || user_id || null;

    if (!user && !authHeader && !resolvedActorId) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { data, error } = await adminClient.from('audit_events').insert({
      actor_id: resolvedActorId,
      entity_type: section,
      entity_id: itemId,
      action: action,
      details: { label: itemLabel, ...details }
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
