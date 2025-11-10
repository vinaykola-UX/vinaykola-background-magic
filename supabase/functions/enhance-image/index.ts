import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const image = formData.get('image');
    const upscaleLevel = formData.get('upscale_level') || '2';

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const DEEPAI_API_KEY = Deno.env.get('DEEPAI_API_KEY');
    if (!DEEPAI_API_KEY) {
      console.error('DEEPAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending image to DeepAI API for enhancement...');

    const deepAIFormData = new FormData();
    deepAIFormData.append('image', image);

    const response = await fetch('https://api.deepai.org/api/torch-srgan', {
      method: 'POST',
      headers: {
        'api-key': DEEPAI_API_KEY,
      },
      body: deepAIFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Image enhancement failed', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Enhancement successful:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in enhance-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
