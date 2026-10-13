-- ============================================================================
-- Fix: Database error saving new user (Supabase Auth Trigger Fix)
-- ============================================================================
-- Run this in your Supabase Dashboard SQL Editor (dzlsxdlzmqcaxwjknnnw):
-- https://supabase.com/dashboard/project/dzlsxdlzmqcaxwjknnnw/sql

-- 1. Ensure extensions schema is properly registered
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS uuid-ossp WITH SCHEMA extensions;

-- 2. Bulletproof handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS 
DECLARE
  v_type         text;
  v_full_name    text;
  v_mobile       text;
  v_aadhaar      text;
  v_location     text;
  v_farm_id      text;
  v_farm_size    numeric := 0;
  v_primary_crop text;
  v_wallet_addr  text;
BEGIN
  -- Extract and sanitize metadata
  v_type         := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'account_type'), ''), 'buyer');
  v_full_name    := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));
  v_mobile       := COALESCE(new.raw_user_meta_data->>'mobile_number', '');
  v_aadhaar      := COALESCE(new.raw_user_meta_data->>'aadhaar_number', '');
  v_location     := COALESCE(new.raw_user_meta_data->>'location', '');
  v_farm_id      := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'farm_id'), ''), 'FC-' || substr(md5(random()::text), 1, 5));
  v_primary_crop := COALESCE(new.raw_user_meta_data->>'primary_crop', '');

  -- Safely parse farm_size without numeric cast error on empty strings
  BEGIN
    v_farm_size := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'farm_size'), '')::numeric, 0);
  EXCEPTION WHEN OTHERS THEN
    v_farm_size := 0;
  END;

  -- 1. Create appropriate profile
  IF v_type = 'farmer' THEN
    INSERT INTO public.farmer_profiles (
      id, full_name, email, mobile_number, aadhaar_number, location,
      farm_id, farm_size, primary_crop, account_type
    ) VALUES (
      new.id, v_full_name, new.email, v_mobile, v_aadhaar, v_location,
      v_farm_id, v_farm_size, v_primary_crop, 'farmer'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      mobile_number = EXCLUDED.mobile_number,
      aadhaar_number = EXCLUDED.aadhaar_number;
  ELSE
    INSERT INTO public.buyer_profiles (
      id, full_name, email, mobile_number, aadhaar_number, account_type
    ) VALUES (
      new.id, v_full_name, new.email, v_mobile, v_aadhaar, 'buyer'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      mobile_number = EXCLUDED.mobile_number,
      aadhaar_number = EXCLUDED.aadhaar_number;
  END IF;

  -- 2. Generate EVM-compatible 42-char wallet address natively (0x + 40 hex chars)
  -- Uses standard Postgres md5() without dependency on pgcrypto / gen_random_bytes
  v_wallet_addr := '0x' || lower(md5(random()::text || clock_timestamp()::text) || substr(md5(new.id::text || random()::text), 1, 8));

  INSERT INTO public.wallets (user_id, wallet_address, balance, account_type)
  VALUES (
    new.id,
    v_wallet_addr,
    0,
    v_type
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation if profile provision encounters an edge case
  RAISE WARNING 'handle_new_user error for user %: %', new.id, SQLERRM;
  RETURN new;
END;
;

-- 3. Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
