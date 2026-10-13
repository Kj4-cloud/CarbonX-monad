-- ============================================================================
-- Fix: Infinite recursion detected in policy for relations orders & order_items
-- Run this in your Supabase Dashboard SQL Editor (dzlsxdlzmqcaxwjknnnw)
-- ============================================================================

-- 1. Helper function for order buyers (SECURITY DEFINER to prevent recursive RLS)
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

-- 2. Helper function for order farmers (SECURITY DEFINER to prevent recursive RLS)
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

-- 3. Replace Orders policies
DROP POLICY IF EXISTS Users can view relevant orders ON public.orders;
CREATE POLICY Users can view relevant orders
  ON public.orders FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR public.is_order_farmer(id)
  );

-- 4. Replace Order Items policies
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
