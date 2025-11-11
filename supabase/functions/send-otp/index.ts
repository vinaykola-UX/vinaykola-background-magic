import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendOTPRequest {
  type: 'email' | 'sms';
  value: string;
}

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendEmailOTP = async (email: string, code: string): Promise<void> => {
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error('SMTP configuration is missing');
  }

  const response = await fetch(`https://${smtpHost}:${smtpPort}/v3/smtp/email`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': smtpPass,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: smtpUser, name: 'OTP Login' },
      to: [{ email }],
      subject: 'Your OTP Code',
      htmlContent: `
        <html>
          <body>
            <h2>Your OTP Code</h2>
            <p>Your one-time password is: <strong>${code}</strong></p>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${await response.text()}`);
  }
};

const sendSMSOTP = async (phone: string, code: string): Promise<void> => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFrom = Deno.env.get('TWILIO_FROM');

  if (!accountSid || !authToken || !twilioFrom) {
    throw new Error('Twilio configuration is missing');
  }

  const auth = btoa(`${accountSid}:${authToken}`);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: twilioFrom,
        Body: `Your OTP code is: ${code}. This code will expire in 5 minutes.`,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to send SMS: ${await response.text()}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, value }: SendOTPRequest = await req.json();

    // Validate input
    if (!type || !value) {
      throw new Error('Missing type or value');
    }

    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Invalid email format');
      }
    } else if (type === 'sms') {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(value)) {
        throw new Error('Invalid phone format (use E.164 format, e.g., +1234567890)');
      }
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        type,
        value,
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      throw new Error('Failed to store OTP');
    }

    // Send OTP
    try {
      if (type === 'email') {
        await sendEmailOTP(value, code);
      } else {
        await sendSMSOTP(value, code);
      }

      // Log success
      await supabase.from('otp_logs').insert({
        action: 'send',
        type,
        value,
        success: true,
      });

      return new Response(
        JSON.stringify({ message: 'OTP sent successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (sendError: any) {
      console.error('Error sending OTP:', sendError);
      
      // Log failure
      await supabase.from('otp_logs').insert({
        action: 'send',
        type,
        value,
        success: false,
        error_message: sendError.message,
      });

      throw new Error(`Failed to send OTP: ${sendError.message}`);
    }
  } catch (error: any) {
    console.error('Error in send-otp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
