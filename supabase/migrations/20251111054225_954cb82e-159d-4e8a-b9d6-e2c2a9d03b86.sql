-- Create table for OTP codes
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  value TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_otp_codes_value_type ON public.otp_codes(value, type);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Create table for OTP logs (for admin debugging)
CREATE TABLE public.otp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  action TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for logs
CREATE INDEX idx_otp_logs_created_at ON public.otp_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies - OTP codes should only be accessible by edge functions (service role)
CREATE POLICY "Service role can manage OTP codes"
ON public.otp_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS policies for logs - only service role can insert, but we'll create a read policy for admin
CREATE POLICY "Service role can manage OTP logs"
ON public.otp_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to clean up expired OTP codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.otp_codes
  WHERE expires_at < now();
END;
$$;