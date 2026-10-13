-- ============================================================================
-- CarbonX Platform — Complete Supabase Database Schema
-- ============================================================================
-- Version:        2.0.0 (Production Consolidated)
-- Target Engine:  PostgreSQL 15+ (Supabase)
-- Description:    Single-file consolidated schema containing all tables,
--                 constraints, relationships, indexes, Row Level Security (RLS)
--                 policies, stored procedures, triggers, realtime setup, and
--                 Supabase Storage configuration for the CarbonX platform.
--
-- Execution:      Paste and run in the Supabase SQL Editor:
--                 Dashboard → SQL Editor → New Query → Run
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table of Contents
-- ----------------------------------------------------------------------------
-- 0. Required Extensions
-- 1. User & Profile Tables
--    1.1 public.farmer_profiles
--    1.2 public.buyer_profiles
-- 2. Land & Project Management
--    2.1 public.land_parcels
--    2.2 public.farmer_projects
--    2.3 public.project_submissions
--    2.4 public.photo_verifications
-- 3. Commerce & Orders
--    3.1 public.orders
--    3.2 public.order_items
--    3.3 public.sales_transactions (Legacy / Direct)
-- 4. In-App Wallet & Financial Ledger
--    4.1 public.wallets
--    4.2 public.wallet_transactions
-- 5. Blockchain & Verification Audits
--    5.1 public.transactions (On-Chain Proofs)
--    5.2 public.blockchain_transactions (Seller Explorer Logs)
-- 6. Performance Indexes
-- 7. Row Level Security (RLS) Policies
-- 8. Stored Procedures & Atomic Functions
--    8.1 public.wallet_transfer()
--    8.2 public.deduct_credits()
--    8.3 public.update_farmer_stats()
--    8.4 public.set_updated_at()
-- 9. Automatic Triggers
--    9.1 public.handle_new_user() (Auth sync for Buyer & Farmer profiles)
--    9.2 Updated timestamp triggers
-- 10. Realtime Publications
-- 11. Supabase Storage Configuration (photo-verifications bucket & policies)
-- ============================================================================


-- ============================================================================
-- 0. Required Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- 1. User & Profile Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 Farmer Profiles
-- Represents verified agricultural sellers participating in carbon sequestration.
-- Extends the Supabase auth.users table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farmer_profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text NOT NULL,
  email               text NOT NULL,
  mobile_number       text DEFAULT '',
  aadhaar_number      text DEFAULT '',
  location            text DEFAULT '',
  bio                 text DEFAULT '',
  avatar_url          text DEFAULT '',
  tier_level          int DEFAULT 1,
  tier_name           text DEFAULT 'Starter',
  tier_progress       int DEFAULT 0,
  portfolio_credits   numeric DEFAULT 0,
  total_revenue       numeric DEFAULT 0,
  farm_id             text DEFAULT ('FC-' || substr(md5(random()::text), 1, 5)),
  farm_size           numeric DEFAULT 0,
  primary_crop        text DEFAULT '',
  account_type        text DEFAULT 'farmer',
  created_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE public.farmer_profiles IS 'Stores seller/farmer identity, farm credentials, gamified tier data, and revenue stats.';
COMMENT ON COLUMN public.farmer_profiles.id IS 'Maps directly to auth.users.id.';
COMMENT ON COLUMN public.farmer_profiles.farm_id IS 'Unique visible farmer identifier (e.g. FC-a1b2c).';
COMMENT ON COLUMN public.farmer_profiles.portfolio_credits IS 'Remaining carbon credits held in farmer inventory.';
COMMENT ON COLUMN public.farmer_profiles.total_revenue IS 'Cumulative earnings generated from carbon credit sales (INR).';


-- ----------------------------------------------------------------------------
-- 1.2 Buyer Profiles
-- Represents corporate and individual purchasers buying carbon offset credits.
-- Extends the Supabase auth.users table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text NOT NULL,
  email               text NOT NULL,
  mobile_number       text DEFAULT '',
  aadhaar_number      text DEFAULT '',
  account_type        text DEFAULT 'buyer',
  created_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE public.buyer_profiles IS 'Stores buyer corporate/individual identity and contact metadata.';
COMMENT ON COLUMN public.buyer_profiles.id IS 'Maps directly to auth.users.id.';


-- ============================================================================
-- 2. Land & Project Management
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Land Parcels
-- Registered agricultural land plots mapped to a farmer with physical metrics.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.land_parcels (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id           uuid NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  acres               numeric NOT NULL CHECK (acres > 0),
  crop                text NOT NULL,
  status              text DEFAULT 'pending',
  badge               text DEFAULT 'Pending Review',
  suggestion          text DEFAULT 'Action: Upload Soil Report',
  suggestion_icon     text DEFAULT 'priority_high',
  latitude            text DEFAULT '',
  longitude           text DEFAULT '',
  soil_type           text DEFAULT '',
  description         text DEFAULT '',
  image_url           text DEFAULT '',
  created_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE public.land_parcels IS 'Individual land plots registered by farmers for MRV carbon tracking.';
COMMENT ON COLUMN public.land_parcels.status IS 'Status lifecycle: pending, verified, high-yield, rejected.';


-- ----------------------------------------------------------------------------
-- 2.2 Farmer Projects
-- Public marketplace listings where carbon credits generated from farm parcels
-- are cataloged, priced, and listed for buyer purchase.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farmer_projects (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id                 uuid NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  farmer_name               text NOT NULL,
  project_name              text NOT NULL,
  description               text DEFAULT '',
  location                  text NOT NULL,
  category                  text NOT NULL DEFAULT 'agriculture',
  land_size_acres           numeric NOT NULL DEFAULT 0,
  plant_type                text DEFAULT '',
  plant_density_per_acre    int DEFAULT 0,
  carbon_credits_generated  numeric DEFAULT 0 CHECK (carbon_credits_generated >= 0),
  credits_sold              numeric DEFAULT 0 CHECK (credits_sold >= 0),
  price_per_credit          numeric NOT NULL DEFAULT 500 CHECK (price_per_credit >= 0),
  land_id                   text DEFAULT '',
  image_url                 text DEFAULT '',
  is_listed                 boolean DEFAULT true,
  verification_status       text DEFAULT 'pending',
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

COMMENT ON TABLE public.farmer_projects IS 'Marketplace credit listings with pricing, verification state, and credit balances.';
COMMENT ON COLUMN public.farmer_projects.credits_sold IS 'Atomic counter of credits purchased; remaining = carbon_credits_generated - credits_sold.';


-- ----------------------------------------------------------------------------
-- 2.3 Project Submissions
-- Multi-step MRV certification pipeline tracking land mapping, satellite analysis,
-- and automated pricing parameters.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id              uuid NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  land_mapping_status    text DEFAULT 'Pending',
  verification_status    text DEFAULT 'Pending',
  photo_evidence_status  text DEFAULT 'Pending',
  marketplace_status     text DEFAULT 'Optional',
  auto_sell              boolean DEFAULT true,
  price_floor            numeric DEFAULT 24.50,
  land_map_image         text DEFAULT '',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

COMMENT ON TABLE public.project_submissions IS 'Tracks status of the 4-phase onboarding verification pipeline.';


-- ----------------------------------------------------------------------------
-- 2.4 Photo Verifications
-- Geo-tagged and timestamped photographic ground-truth evidence submitted by
-- farmers to validate agricultural practices against satellite readings.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photo_verifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id      uuid NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  project_id     uuid REFERENCES public.farmer_projects(id) ON DELETE SET NULL,
  title          text NOT NULL,
  image_url      text DEFAULT '',
  file_size      text DEFAULT '',
  capture_time   text DEFAULT '',
  direction      text DEFAULT '',
  gps_fix        boolean DEFAULT false,
  status         text DEFAULT 'pending',
  coordinates    text DEFAULT '',
  capture_date   date DEFAULT CURRENT_DATE,
  created_at     timestamptz DEFAULT now()
);

COMMENT ON TABLE public.photo_verifications IS 'Field inspection photos with GPS coordinates and timestamps.';


-- ============================================================================
-- 3. Commerce & Orders
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Orders
-- Master records of completed or pending carbon credit checkout transactions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount           numeric NOT NULL CHECK (total_amount >= 0),
  total_credits          numeric NOT NULL CHECK (total_credits >= 0),
  status                 text NOT NULL DEFAULT 'completed',
  buyer_wallet_address   text DEFAULT '',
  payment_method         text DEFAULT 'carbonx_wallet',
  created_at             timestamptz DEFAULT now()
);

COMMENT ON TABLE public.orders IS 'Master purchase order records linking buyers to multi-item checkouts.';
COMMENT ON COLUMN public.orders.payment_method IS 'carbonx_wallet, metamask, upi, or card.';


-- ----------------------------------------------------------------------------
-- 3.2 Order Items
-- Line items within an order linking specific farmer projects to purchased quantities.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  project_id             uuid REFERENCES public.farmer_projects(id) ON DELETE SET NULL,
  farmer_id              uuid REFERENCES public.farmer_profiles(id) ON DELETE SET NULL,
  quantity               numeric NOT NULL CHECK (quantity > 0),
  credits_purchased      numeric NOT NULL DEFAULT 0,
  price_per_credit       numeric NOT NULL CHECK (price_per_credit >= 0),
  farmer_wallet_address  text DEFAULT '',
  created_at             timestamptz DEFAULT now()
);

COMMENT ON TABLE public.order_items IS 'Line item details connecting orders with individual projects and beneficiary farmers.';


-- ----------------------------------------------------------------------------
-- 3.3 Sales Transactions (Legacy / Direct Farmer Ledger)
-- Direct sales summaries displayed on seller analytics dashboards.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id         uuid NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  buyer_name        text NOT NULL,
  credits           int NOT NULL,
  amount            numeric NOT NULL,
  transaction_date  date DEFAULT CURRENT_DATE,
  status            text DEFAULT 'Pending',
  created_at        timestamptz DEFAULT now()
);

COMMENT ON TABLE public.sales_transactions IS 'Historical and manual sales log entries for seller reporting.';


-- ============================================================================
-- 4. In-App Wallet & Financial Ledger
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Wallets
-- Custodial and in-app balance balances mapped 1-to-1 with platform users.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL UNIQUE,
  balance        numeric DEFAULT 0 CHECK (balance >= 0),
  account_type   text DEFAULT 'buyer',
  created_at     timestamptz DEFAULT now()
);

COMMENT ON TABLE public.wallets IS 'User balance store supporting in-app deposit, transfer, and checkout settlement.';
COMMENT ON COLUMN public.wallets.balance IS 'Balance in INR (checked >= 0). Balance updates should be made via wallet_transfer().';


-- ----------------------------------------------------------------------------
-- 4.2 Wallet Transactions
-- Double-entry audit ledger for all wallet balance movements.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('deposit', 'withdraw', 'purchase', 'sale')),
  amount         numeric NOT NULL,
  description    text DEFAULT '',
  tx_hash        text DEFAULT '',
  from_address   text DEFAULT '',
  to_address     text DEFAULT '',
  order_id       uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

COMMENT ON TABLE public.wallet_transactions IS 'Audit log of deposits, withdrawals, credit purchases, and payouts.';


-- ============================================================================
-- 5. Blockchain & Verification Audits
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Transactions (On-Chain Proofs)
-- Indexed smart contract events (minting, transfers, retirements) on Monad Testnet.
-- Queried by public explorers and the live certificate verification hook.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash       text NOT NULL UNIQUE,
  from_addr     text DEFAULT '',
  to_addr       text DEFAULT '',
  token_id      int DEFAULT 1,
  amount        numeric NOT NULL DEFAULT 0,
  tx_type       text NOT NULL,
  credit_name   text DEFAULT '',
  status        text DEFAULT 'confirmed',
  block_number  bigint,
  created_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'On-chain proof ledger indexing ERC-1155 mint, transfer, and retirement events.';


-- ----------------------------------------------------------------------------
-- 5.2 Blockchain Transactions (Seller Explorer Logs)
-- Detailed telemetry for minting events and metadata hashes displayed on the
-- Seller Blockchain Explorer page.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blockchain_transactions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id            uuid NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  tx_hash              text DEFAULT '',
  network              text DEFAULT 'Monad Testnet',
  staking_status       text DEFAULT 'Success',
  status_message       text DEFAULT '',
  minting_event        text DEFAULT '',
  tx_timestamp         text DEFAULT '',
  gas_consumed         text DEFAULT '',
  token_id             text DEFAULT '',
  token_standard       text DEFAULT 'ERC-1155 (Multi-Token)',
  contract_address     text DEFAULT '',
  impact_image         text DEFAULT '',
  coordinates          text DEFAULT '',
  project_id           text DEFAULT '',
  verified_tonnes      numeric DEFAULT 0,
  methodology          text DEFAULT '',
  cert_type            text DEFAULT '',
  network_load_label   text DEFAULT 'Optimal',
  network_load_percent int DEFAULT 35,
  created_at           timestamptz DEFAULT now()
);

COMMENT ON TABLE public.blockchain_transactions IS 'Telemetry logs providing verification proof details for farmers.';


-- ============================================================================
-- 6. Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_farmer_projects_farmer_id       ON public.farmer_projects(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_projects_is_listed       ON public.farmer_projects(is_listed);
CREATE INDEX IF NOT EXISTS idx_farmer_projects_created_at      ON public.farmer_projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_land_parcels_farmer_id          ON public.land_parcels(farmer_id);
CREATE INDEX IF NOT EXISTS idx_photo_verifications_farmer_id   ON public.photo_verifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_photo_verifications_project_id  ON public.photo_verifications(project_id);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id                 ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at               ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id            ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_farmer_id           ON public.order_items(farmer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_project_id          ON public.order_items(project_id);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id                 ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_address          ON public.wallets(wallet_address);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id             ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at            ON public.wallet_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash            ON public.transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at         ON public.transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_farmer_id         ON public.blockchain_transactions(farmer_id);


-- ============================================================================
-- 7. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.farmer_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_parcels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- 7.1 Farmer Profiles Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Farmers can view own profile"   ON public.farmer_profiles;
DROP POLICY IF EXISTS "Anyone can view farmer public"   ON public.farmer_profiles;
DROP POLICY IF EXISTS "Farmers can update own profile" ON public.farmer_profiles;
DROP POLICY IF EXISTS "Farmers can insert own profile" ON public.farmer_profiles;

CREATE POLICY "Farmers can view own profile"
  ON public.farmer_profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow buyers to see seller names on marketplace items
CREATE POLICY "Anyone can view farmer public"
  ON public.farmer_profiles FOR SELECT
  USING (true);

CREATE POLICY "Farmers can update own profile"
  ON public.farmer_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Farmers can insert own profile"
  ON public.farmer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- 7.2 Buyer Profiles Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Buyers can view own profile"   ON public.buyer_profiles;
DROP POLICY IF EXISTS "Buyers can update own profile" ON public.buyer_profiles;
DROP POLICY IF EXISTS "Buyers can insert own profile" ON public.buyer_profiles;

CREATE POLICY "Buyers can view own profile"
  ON public.buyer_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Buyers can update own profile"
  ON public.buyer_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Buyers can insert own profile"
  ON public.buyer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- 7.3 Land Parcels Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Farmers can view own parcels"   ON public.land_parcels;
DROP POLICY IF EXISTS "Farmers can insert own parcels" ON public.land_parcels;
DROP POLICY IF EXISTS "Farmers can update own parcels" ON public.land_parcels;
DROP POLICY IF EXISTS "Farmers can delete own parcels" ON public.land_parcels;

CREATE POLICY "Farmers can view own parcels"
  ON public.land_parcels FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert own parcels"
  ON public.land_parcels FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own parcels"
  ON public.land_parcels FOR UPDATE
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete own parcels"
  ON public.land_parcels FOR DELETE
  USING (auth.uid() = farmer_id);


-- ----------------------------------------------------------------------------
-- 7.4 Farmer Projects Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view listed projects"  ON public.farmer_projects;
DROP POLICY IF EXISTS "Farmers can insert projects"      ON public.farmer_projects;
DROP POLICY IF EXISTS "Farmers can update own projects"  ON public.farmer_projects;
DROP POLICY IF EXISTS "Farmers can delete own projects"  ON public.farmer_projects;

CREATE POLICY "Anyone can view listed projects"
  ON public.farmer_projects FOR SELECT
  USING (is_listed = true OR auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert projects"
  ON public.farmer_projects FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own projects"
  ON public.farmer_projects FOR UPDATE
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete own projects"
  ON public.farmer_projects FOR DELETE
  USING (auth.uid() = farmer_id);


-- ----------------------------------------------------------------------------
-- 7.5 Project Submissions Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Farmers can view own submissions"   ON public.project_submissions;
DROP POLICY IF EXISTS "Farmers can insert own submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Farmers can update own submissions" ON public.project_submissions;

CREATE POLICY "Farmers can view own submissions"
  ON public.project_submissions FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert own submissions"
  ON public.project_submissions FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own submissions"
  ON public.project_submissions FOR UPDATE
  USING (auth.uid() = farmer_id);


-- ----------------------------------------------------------------------------
-- 7.6 Photo Verifications Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Farmers can view own photos"   ON public.photo_verifications;
DROP POLICY IF EXISTS "Public can view project photos" ON public.photo_verifications;
DROP POLICY IF EXISTS "Farmers can insert own photos" ON public.photo_verifications;
DROP POLICY IF EXISTS "Farmers can update own photos" ON public.photo_verifications;

CREATE POLICY "Farmers can view own photos"
  ON public.photo_verifications FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Public can view project photos"
  ON public.photo_verifications FOR SELECT
  USING (true);

CREATE POLICY "Farmers can insert own photos"
  ON public.photo_verifications FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own photos"
  ON public.photo_verifications FOR UPDATE
  USING (auth.uid() = farmer_id);


-- ----------------------------------------------------------------------------
-- 7.7 Orders Policies
-- Buyers see their purchases; Farmers see orders containing their sold items.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view relevant orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can create orders"       ON public.orders;

CREATE OR REPLACE FUNCTION public.is_order_buyer(p_order_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND buyer_id = auth.uid());
$;

CREATE OR REPLACE FUNCTION public.is_order_farmer(p_order_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $
  SELECT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id AND farmer_id = auth.uid());
$;

CREATE POLICY "Users can view relevant orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR public.is_order_farmer(id)
  );

CREATE POLICY "Buyers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);


-- ----------------------------------------------------------------------------
-- 7.8 Order Items Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view relevant order items" ON public.order_items;
DROP POLICY IF EXISTS "Buyers can insert order items"       ON public.order_items;

CREATE POLICY "Users can view relevant order items"
  ON public.order_items FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR public.is_order_buyer(order_id)
  );

CREATE POLICY "Buyers can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    public.is_order_buyer(order_id)
  );


-- ----------------------------------------------------------------------------
-- 7.9 Wallets Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own wallet"          ON public.wallets;
DROP POLICY IF EXISTS "Anyone can read wallets by address" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallet"        ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet"        ON public.wallets;

CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Required during checkout so buyer can resolve seller wallet address
CREATE POLICY "Anyone can read wallets by address"
  ON public.wallets FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 7.10 Wallet Transactions Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own wallet transactions"   ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Users can view own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own wallet transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
  );


-- ----------------------------------------------------------------------------
-- 7.11 Sales Transactions Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Farmers can view own sales"   ON public.sales_transactions;
DROP POLICY IF EXISTS "Farmers can insert own sales" ON public.sales_transactions;

CREATE POLICY "Farmers can view own sales"
  ON public.sales_transactions FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert own sales"
  ON public.sales_transactions FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);


-- ----------------------------------------------------------------------------
-- 7.12 Blockchain Transactions (Telemetry) Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Farmers can view own blockchain txs"   ON public.blockchain_transactions;
DROP POLICY IF EXISTS "Farmers can insert own blockchain txs" ON public.blockchain_transactions;

CREATE POLICY "Farmers can view own blockchain txs"
  ON public.blockchain_transactions FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert own blockchain txs"
  ON public.blockchain_transactions FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);


-- ----------------------------------------------------------------------------
-- 7.13 Transactions (Public Proofs) Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read for on-chain proofs" ON public.transactions;
DROP POLICY IF EXISTS "Insert on-chain proofs"          ON public.transactions;

CREATE POLICY "Public read for on-chain proofs"
  ON public.transactions FOR SELECT
  USING (true);

CREATE POLICY "Insert on-chain proofs"
  ON public.transactions FOR INSERT
  WITH CHECK (true);


-- ============================================================================
-- 8. Stored Procedures & Atomic Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 8.1 Atomic Wallet-to-Wallet Transfer Function
-- Prevents double-spending, locks row records to avoid race conditions,
-- deducts from sender, credits receiver, and inserts dual ledger logs atomically.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wallet_transfer(
  p_from_user_id  uuid,
  p_to_user_id    uuid,
  p_amount        numeric,
  p_description   text DEFAULT '',
  p_order_id      uuid DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_from_wallet public.wallets%ROWTYPE;
  v_to_wallet   public.wallets%ROWTYPE;
  v_tx_hash     text;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Transfer amount must be greater than zero');
  END IF;

  -- Deadlock-free locking: always lock the smaller UUID first
  IF p_from_user_id < p_to_user_id THEN
    SELECT * INTO v_from_wallet FROM public.wallets WHERE user_id = p_from_user_id FOR UPDATE;
    SELECT * INTO v_to_wallet   FROM public.wallets WHERE user_id = p_to_user_id FOR UPDATE;
  ELSE
    SELECT * INTO v_to_wallet   FROM public.wallets WHERE user_id = p_to_user_id FOR UPDATE;
    SELECT * INTO v_from_wallet FROM public.wallets WHERE user_id = p_from_user_id FOR UPDATE;
  END IF;

  IF v_from_wallet.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender wallet not found');
  END IF;

  IF v_to_wallet.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Receiver wallet not found');
  END IF;

  IF v_from_wallet.balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Generate cryptographically random transaction hash
  v_tx_hash := '0x' || encode(gen_random_bytes(32), 'hex');

  -- Deduct from sender
  UPDATE public.wallets
  SET balance = balance - p_amount
  WHERE id = v_from_wallet.id;

  -- Credit to receiver
  UPDATE public.wallets
  SET balance = balance + p_amount
  WHERE id = v_to_wallet.id;

  -- Log sender-side transaction (purchase)
  INSERT INTO public.wallet_transactions (
    wallet_id, type, amount, description, tx_hash, from_address, to_address, order_id
  ) VALUES (
    v_from_wallet.id, 'purchase', p_amount, p_description, v_tx_hash,
    v_from_wallet.wallet_address, v_to_wallet.wallet_address, p_order_id
  );

  -- Log receiver-side transaction (sale)
  INSERT INTO public.wallet_transactions (
    wallet_id, type, amount, description, tx_hash, from_address, to_address, order_id
  ) VALUES (
    v_to_wallet.id, 'sale', p_amount, p_description, v_tx_hash,
    v_from_wallet.wallet_address, v_to_wallet.wallet_address, p_order_id
  );

  RETURN json_build_object(
    'success', true,
    'tx_hash', v_tx_hash,
    'from_address', v_from_wallet.wallet_address,
    'to_address', v_to_wallet.wallet_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.wallet_transfer IS 'Executes an atomic balance transfer between two wallets with deadlock protection and ledger logging.';


-- ----------------------------------------------------------------------------
-- 8.2 Atomic Credit Deduction Function
-- Locks project inventory row, validates remaining credits, and records credits sold.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_project_id  uuid,
  p_quantity    numeric
) RETURNS json AS $$
DECLARE
  v_proj public.farmer_projects%ROWTYPE;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  -- Lock row to prevent concurrent overselling
  SELECT * INTO v_proj FROM public.farmer_projects WHERE id = p_project_id FOR UPDATE;

  IF v_proj.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  IF (COALESCE(v_proj.carbon_credits_generated, 0) - COALESCE(v_proj.credits_sold, 0)) < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credit supply remaining');
  END IF;

  UPDATE public.farmer_projects
  SET credits_sold = COALESCE(credits_sold, 0) + p_quantity,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.deduct_credits IS 'Atomically reserves and sells carbon credits from a project listing under row lock.';


-- ----------------------------------------------------------------------------
-- 8.3 Atomic Farmer Statistics & Revenue Update Function
-- Increases cumulative revenue and decrements portfolio credits on the seller profile.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_farmer_stats(
  p_farmer_id  uuid,
  p_credits    numeric,
  p_revenue    numeric
) RETURNS json AS $$
BEGIN
  UPDATE public.farmer_profiles
  SET total_revenue     = COALESCE(total_revenue, 0) + p_revenue,
      portfolio_credits = GREATEST(0, COALESCE(portfolio_credits, 0) - p_credits)
  WHERE id = p_farmer_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_farmer_stats IS 'Increments total revenue and decrements available portfolio credits for a farmer.';


-- ----------------------------------------------------------------------------
-- 8.4 Automatic Updated At Timestamp Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 9. Automatic Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 9.1 Auth User Provisioning Trigger
-- Automatically provisions the corresponding farmer or buyer profile and an in-app
-- wallet whenever a new user registers through Supabase Auth (email or OAuth).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $
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
$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 9.2 Auto-update updated_at Columns
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_farmer_projects_updated_at ON public.farmer_projects;
CREATE TRIGGER trg_farmer_projects_updated_at
  BEFORE UPDATE ON public.farmer_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_submissions_updated_at ON public.project_submissions;
CREATE TRIGGER trg_project_submissions_updated_at
  BEFORE UPDATE ON public.project_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- 10. Realtime Publications
-- Enables live Supabase postgres_changes event streaming for UI reactivity.
-- ============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.farmer_projects;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_verifications;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.land_parcels;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;


-- ============================================================================
-- 11. Supabase Storage Configuration
-- Sets up the 'photo-verifications' bucket for MRV ground truth photos.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photo-verifications',
  'photo-verifications',
  true,
  52428800, -- 50 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public Access Photo Verifications" ON storage.objects;
CREATE POLICY "Public Access Photo Verifications"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photo-verifications');

DROP POLICY IF EXISTS "Authenticated users upload photo verifications" ON storage.objects;
CREATE POLICY "Authenticated users upload photo verifications"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photo-verifications'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update their verification photos" ON storage.objects;
CREATE POLICY "Users can update their verification photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'photo-verifications'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can delete their verification photos" ON storage.objects;
CREATE POLICY "Users can delete their verification photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'photo-verifications'
    AND auth.role() = 'authenticated'
  );

-- ============================================================================
-- End of Schema Definition
-- ============================================================================
