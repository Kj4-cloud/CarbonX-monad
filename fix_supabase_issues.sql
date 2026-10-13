-- ============================================================================
-- CarbonX - Unified Fix for Registration Error & Orders RLS Recursion
-- Run this in your Supabase Dashboard SQL Editor (dzlsxdlzmqcaxwjknnnw):
-- https://supabase.com/dashboard/project/dzlsxdlzmqcaxwjknnnw/sql
-- ============================================================================

-- ============================================================================
-- PART 1: FIX REGISTRATION TRIGGER (Database error saving new user)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS uuid-ossp WITH SCHEMA extensions;

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
  v_type         := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'account_type'), ''), 'buyer');
  v_full_name    := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));
  v_mobile       := COALESCE(new.raw_user_meta_data->>'mobile_number', '');
  v_aadhaar      := COALESCE(new.raw_user_meta_data->>'aadhaar_number', '');
  v_location     := COALESCE(new.raw_user_meta_data->>'location', '');
  v_farm_id      := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'farm_id'), ''), 'FC-' || substr(md5(random()::text), 1, 5));
  v_primary_crop := COALESCE(new.raw_user_meta_data->>'primary_crop', '');

  BEGIN
    v_farm_size := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'farm_size'), '')::numeric, 0);
  EXCEPTION WHEN OTHERS THEN
    v_farm_size := 0;
  END;

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
  RAISE WARNING 'handle_new_user error for user %: %', new.id, SQLERRM;
  RETURN new;
END;
;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- PART 2: FIX ORDERS & ORDER_ITEMS RLS RECURSION (Error 42P17)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_order_buyer(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS 
  SELECT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND buyer_id = auth.uid()
  );
;

CREATE OR REPLACE FUNCTION public.is_order_farmer(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS 
  SELECT EXISTS (
    SELECT 1 FROM public.order_items WHERE order_id = p_order_id AND farmer_id = auth.uid()
  );
;

DROP POLICY IF EXISTS Users can view relevant orders ON public.orders;
CREATE POLICY Users can view relevant orders
  ON public.orders FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR public.is_order_farmer(id)
  );

DROP POLICY IF EXISTS Users can view relevant order items ON public.order_items;
CREATE POLICY Users can view relevant order items
  ON public.order_items FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR public.is_order_buyer(order_id)
  );

DROP POLICY IF EXISTS Buyers can insert order items ON public.order_items;
CREATE POLICY Buyers can insert order items
  ON public.order_items FOR INSERT
  WITH CHECK (
    public.is_order_buyer(order_id)
  );
