-- Create profiles table with credits system
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  avatar_url TEXT,
  credits INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Service role can insert profiles
CREATE POLICY "Service role can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_credits INTEGER;
BEGIN
  -- Check if user signed up with Google OAuth
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    user_credits := 5;
  ELSE
    user_credits := 1;
  END IF;

  -- Insert profile with appropriate credits
  INSERT INTO public.profiles (id, email, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    user_credits
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create credits history table
CREATE TABLE public.credits_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on credits_history
ALTER TABLE public.credits_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own credit history
CREATE POLICY "Users can view own credit history"
ON public.credits_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_credits(user_id_input UUID, amount INTEGER, action_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE id = user_id_input;

  -- Check if user has enough credits
  IF current_credits < amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct credits
  UPDATE public.profiles
  SET credits = credits - amount,
      updated_at = NOW()
  WHERE id = user_id_input;

  -- Log the transaction
  INSERT INTO public.credits_history (user_id, amount, action)
  VALUES (user_id_input, -amount, action_name);

  RETURN TRUE;
END;
$$;

-- Function to add credits
CREATE OR REPLACE FUNCTION public.add_credits(user_id_input UUID, amount INTEGER, action_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add credits
  UPDATE public.profiles
  SET credits = credits + amount,
      updated_at = NOW()
  WHERE id = user_id_input;

  -- Log the transaction
  INSERT INTO public.credits_history (user_id, amount, action)
  VALUES (user_id_input, amount, action_name);

  RETURN TRUE;
END;
$$;

-- Drop OTP tables as they're no longer needed
DROP TABLE IF EXISTS public.otp_codes CASCADE;
DROP TABLE IF EXISTS public.otp_logs CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_otps() CASCADE;