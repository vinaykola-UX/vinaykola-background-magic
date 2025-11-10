import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

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

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HUGGING_FACE_ACCESS_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!HUGGING_FACE_ACCESS_TOKEN) {
      console.error('HUGGING_FACE_ACCESS_TOKEN is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enhancing image with HuggingFace...');

    const hf = new HfInference(HUGGING_FACE_ACCESS_TOKEN);

    // Convert File/Blob to ArrayBuffer for HuggingFace
    const imageBlob = image as Blob;
    const imageBuffer = await imageBlob.arrayBuffer();

    // Use a super-resolution model for image enhancement
    const enhancedImage = await hf.imageToImage({
      model: "caidas/swin2SR-classical-sr-x2-64",
      inputs: new Blob([imageBuffer]),
    });

    // Convert the enhanced image to base64
    const arrayBuffer = await enhancedImage.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const output_url = `data:image/png;base64,${base64}`;

    console.log('Enhancement successful');

    return new Response(
      JSON.stringify({ output_url }),
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
