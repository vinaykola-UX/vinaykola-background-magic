import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.credits < 1) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. You need at least 1 credit to enhance images.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get form data
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

    // Validate image is a Blob
    if (!(image instanceof Blob)) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBlob = image as Blob;

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (imageBlob.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 10MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(imageBlob.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, and WebP are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate upscale level
    const upscaleNum = parseInt(upscaleLevel);
    if (isNaN(upscaleNum) || upscaleNum < 1 || upscaleNum > 4) {
      return new Response(
        JSON.stringify({ error: 'Invalid upscale level. Must be between 1 and 4' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert image to base64 for AI processing
    const imageBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Image = btoa(binary);
    const dataUrl = `data:${imageBlob.type};base64,${base64Image}`;

    // Deduct credit
    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_credits', {
        user_id_input: user.id,
        amount: 1,
        action_name: 'image_enhancement'
      });

    if (deductError || !deductResult) {
      console.error('Error deducting credits:', deductError);
      return new Response(
        JSON.stringify({ error: 'Failed to process credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      // Refund credit on configuration error
      await supabase.rpc('add_credits', {
        user_id_input: user.id,
        amount: 1,
        action_name: 'image_enhancement_refund'
      });
      return new Response(
        JSON.stringify({ error: 'Service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enhancing image with Lovable AI...');

    // Use Lovable AI to enhance the image (dataUrl already prepared above)
    const enhancementPrompt = `Enhance this image to improve its quality. Make it sharper, more detailed, and upscale it by ${upscaleNum}x. Preserve the original content and style while improving clarity and resolution.`;
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: enhancementPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      // Refund credit on AI service error
      await supabase.rpc('add_credits', {
        user_id_input: user.id,
        amount: 1,
        action_name: 'image_enhancement_refund'
      });

      return new Response(
        JSON.stringify({ error: 'AI enhancement failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const enhancedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!enhancedImageUrl) {
      console.error('No enhanced image in response');
      
      // Refund credit if no image returned
      await supabase.rpc('add_credits', {
        user_id_input: user.id,
        amount: 1,
        action_name: 'image_enhancement_refund'
      });

      return new Response(
        JSON.stringify({ error: 'No enhanced image returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enhancement successful, credit deducted for user:', user.id);

    return new Response(
      JSON.stringify({ 
        output_url: enhancedImageUrl,
        creditsRemaining: profile.credits - 1
      }),
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
