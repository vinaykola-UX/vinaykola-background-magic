import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyOTPRequest {
  type: 'email' | 'sms';
  value: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('JWT_SECRET')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, value, code }: VerifyOTPRequest = await req.json();

    // Validate input
    if (!type || !value || !code) {
      throw new Error('Missing type, value, or code');
    }

    // Find the OTP
    const { data: otpRecords, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('type', type)
      .eq('value', value)
      .eq('code', code)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching OTP:', fetchError);
      throw new Error('Failed to verify OTP');
    }

    if (!otpRecords || otpRecords.length === 0) {
      await supabase.from('otp_logs').insert({
        action: 'verify',
        type,
        value,
        success: false,
        error_message: 'Invalid OTP code',
      });
      throw new Error('Invalid OTP code');
    }

    const otpRecord = otpRecords[0];

    // Check if OTP is expired
    const expiresAt = new Date(otpRecord.expires_at);
    if (expiresAt < new Date()) {
      await supabase.from('otp_logs').insert({
        action: 'verify',
        type,
        value,
        success: false,
        error_message: 'OTP has expired',
      });
      throw new Error('OTP has expired');
    }

    // Mark OTP as verified
    await supabase
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Create JWT session token
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const jwt = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: value,
        type,
        exp: getNumericDate(60 * 60 * 24), // 24 hours
      },
      key
    );

    // Log success
    await supabase.from('otp_logs').insert({
      action: 'verify',
      type,
      value,
      success: true,
    });

    return new Response(
      JSON.stringify({ 
        message: 'OTP verified successfully',
        token: jwt
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${jwt}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
        } 
      }
    );
  } catch (error: any) {
    console.error('Error in verify-otp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
