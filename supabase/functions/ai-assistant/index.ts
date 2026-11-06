import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

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
    } catch {
      // Ignored for custom auth clients
    }
    if (!user && !authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const { query } = await req.json();
    const apiKey = Deno.env.get('OPENAI_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({
        antwoord: "Ik kan je helpen met afspraken, kosten of de zorgregeling. Wat wil je regelen?",
        actie: "geen",
        opties: ["Afspraak toevoegen", "Kosten verrekenen", "Wisselmoment bekijken"]
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Je bent de slimme assistent in Ouderschap & Co. Classificeer de intentie van de ouder in een van de categorieën: afspraak_toevoegen, wissel_ruil, kosten, taak_toevoegen, document_zoeken, geen. Geef antwoord in JSON formaat met { antwoord, actie, opties }.'
        },
        { role: 'user', content: query }
      ],
      response_format: { type: "json_object" }
    });

    return new Response(response.choices[0].message.content, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
