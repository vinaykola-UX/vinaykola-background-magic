import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

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
    const upscaleLevelRaw = formData.get('upscale_level');
    const upscaleLevel = upscaleLevelRaw ? upscaleLevelRaw.toString() : '2';

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
    if (!REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN is not configured');
      return new Response(
        JSON.stringify({ error: 'API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enhancing image with Replicate...');

    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN,
    });

    // Convert image to base64 in chunks to avoid stack overflow
    const imageBlob = image as Blob;
    const imageBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    
    // Process in chunks to avoid "Maximum call stack size exceeded"
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Image = btoa(binary);
    const dataUrl = `data:${imageBlob.type};base64,${base64Image}`;

    // Use Replicate's Real-ESRGAN model for super-resolution
    const output = await replicate.run(
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      {
        input: {
          image: dataUrl,
          scale: parseInt(upscaleLevel),
          face_enhance: false,
        }
      }
    ) as string;

    console.log('Enhancement successful');

    return new Response(
      JSON.stringify({ output_url: output }),
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
