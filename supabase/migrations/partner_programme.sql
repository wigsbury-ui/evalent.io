
-- PARTNER PROGRAMME SCHEMA
-- Run in Supabase SQL editor

-- 1. Partner Types (fully editable by superadmin)
CREATE TABLE IF NOT EXISTS partner_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  commission_model TEXT NOT NULL CHECK (commission_model IN ('fixed', 'percentage')),
  commission_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_scope TEXT NOT NULL DEFAULT 'first_payment' CHECK (commission_scope IN ('first_payment', 'first_year', 'recurring')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default partner types
INSERT INTO partner_types (name, description, commission_model, commission_value, commission_scope) VALUES
  ('Basic Referral',   'One-time fixed fee per converted school. Ideal for informal referrers.',                    'fixed',      300,  'first_payment'),
  ('Reseller',         'Percentage of first-year ARR. For agents actively selling Evalent.',                        'percentage', 15,   'first_year'),
  ('Senior Partner',   'Ongoing percentage of every payment. Reserved for high-volume strategic partners.',         'percentage', 10,   'recurring'),
  ('Influencer',       'Percentage of first payment. For content creators and thought leaders driving inbound.',     'percentage', 12,   'first_payment'),
  ('Custom',           'Fully negotiated rate set per-partner. Commission values overridden at partner level.',      'fixed',      0,    'first_payment')
ON CONFLICT DO NOTHING;

-- 2. Partners
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  company TEXT,
  partner_type_id UUID REFERENCES partner_types(id),
  -- Commission override (null = use type defaults)
  override_commission_model TEXT CHECK (override_commission_model IN ('fixed', 'percentage')),
  override_commission_value DECIMAL(10,2),
  override_commission_scope TEXT CHECK (override_commission_scope IN ('first_payment', 'first_year', 'recurring')),
  -- Auth
  password_hash TEXT,
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  -- Portal
  bio TEXT,
  notes TEXT,
  -- Stats (denormalised for speed)
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Referral Links
CREATE TABLE IF NOT EXISTS referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  label TEXT,
  destination_url TEXT DEFAULT 'https://app.evalent.io/signup',
  clicks INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Referral Conversions
CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id),
  referral_link_id UUID REFERENCES referral_links(id),
  school_id UUID REFERENCES schools(id),
  subscription_tier TEXT,
  conversion_value_usd DECIMAL(10,2),
  commission_model TEXT,
  commission_rate DECIMAL(10,4),
  commission_earned DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Partner Payouts
CREATE TABLE IF NOT EXISTS partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  conversion_ids UUID[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for referral link lookups (used on every signup)
CREATE INDEX IF NOT EXISTS idx_referral_links_slug ON referral_links(slug);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_partner ON referral_conversions(partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_school ON referral_conversions(school_id);
