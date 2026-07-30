-- ============================================================
-- Kustom Kreations — PostgreSQL Schema
-- Designed for future extensibility: multiple product types,
-- sizes, and template categories without schema rewrites.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Customers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,                        -- NULL for guest/social
  first_name    TEXT,
  last_name     TEXT,
  phone         TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
  label         TEXT,                        -- 'Home', 'Work' etc
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  line1         TEXT NOT NULL,
  line2         TEXT,
  city          TEXT NOT NULL,
  county        TEXT,
  postcode      TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'GB', -- GB, IM, IE
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Products (extensible for future types) ──────────────────
CREATE TABLE IF NOT EXISTS product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,         -- 'magnets', 'keyrings', 'coasters'
  name        TEXT NOT NULL,
  description TEXT,
  active      BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id       UUID REFERENCES product_categories(id),
  slug              TEXT UNIQUE NOT NULL,   -- 'photo-magnet-50mm'
  name              TEXT NOT NULL,
  description       TEXT,
  -- Physical specs (used for print validation and packaging)
  width_mm          NUMERIC(6,2) NOT NULL,
  height_mm         NUMERIC(6,2) NOT NULL,
  -- Print resolution requirements
  min_dpi           INTEGER NOT NULL DEFAULT 100,   -- below: block
  warn_dpi          INTEGER NOT NULL DEFAULT 150,   -- below: warn
  target_dpi        INTEGER NOT NULL DEFAULT 300,   -- ideal
  -- Pricing
  base_price_gbp    NUMERIC(10,2) NOT NULL,
  base_price_eur    NUMERIC(10,2) NOT NULL,
  -- S3 key for product display image
  display_image_key TEXT,
  active            BOOLEAN DEFAULT TRUE,
  sort_order        INTEGER DEFAULT 0,
  metadata          JSONB DEFAULT '{}',      -- future: template options, shape, etc.
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Quantity-based bulk discount tiers per product
CREATE TABLE IF NOT EXISTS bulk_discount_tiers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  min_qty     INTEGER NOT NULL,
  max_qty     INTEGER,                      -- NULL = unlimited
  discount_pct NUMERIC(5,2) NOT NULL,       -- e.g. 10.00 = 10%
  label       TEXT,                         -- 'Buy 5+, save 10%'
  active      BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0
);

-- ─── Discount / Promo Codes ──────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL CHECK (type IN ('percent', 'fixed_gbp', 'fixed_eur', 'free_shipping')),
  value           NUMERIC(10,2),            -- pct or fixed amount
  min_order_gbp   NUMERIC(10,2),
  min_order_eur   NUMERIC(10,2),
  max_uses        INTEGER,                  -- NULL = unlimited
  uses_count      INTEGER DEFAULT 0,
  per_customer_limit INTEGER DEFAULT 1,
  valid_from      TIMESTAMPTZ,
  valid_until     TIMESTAMPTZ,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Gift Vouchers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gift_vouchers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  initial_balance_gbp NUMERIC(10,2),
  initial_balance_eur NUMERIC(10,2),
  remaining_balance_gbp NUMERIC(10,2),
  remaining_balance_eur NUMERIC(10,2),
  purchaser_email TEXT,
  recipient_email TEXT,
  recipient_name  TEXT,
  message         TEXT,
  valid_until     TIMESTAMPTZ,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Shipping ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_zones (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      TEXT NOT NULL,               -- 'UK Mainland', 'Isle of Man', 'Republic of Ireland'
  countries TEXT[] NOT NULL,             -- ['GB'], ['IM'], ['IE']
  currency  TEXT NOT NULL DEFAULT 'GBP'
);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id         UUID REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,          -- 'Standard', 'Express'
  description     TEXT,
  price_gbp       NUMERIC(10,2),
  price_eur       NUMERIC(10,2),
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  free_from_gbp   NUMERIC(10,2),         -- free shipping threshold
  free_from_eur   NUMERIC(10,2),
  active          BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0
);

-- ─── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT UNIQUE NOT NULL,  -- 'KK-20240001'
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  guest_email         TEXT,                  -- for guest checkout
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','payment_processing','paid','in_production','dispatched','delivered','cancelled','refunded')),
  -- Shipping
  shipping_first_name TEXT NOT NULL,
  shipping_last_name  TEXT NOT NULL,
  shipping_line1      TEXT NOT NULL,
  shipping_line2      TEXT,
  shipping_city       TEXT NOT NULL,
  shipping_county     TEXT,
  shipping_postcode   TEXT NOT NULL,
  shipping_country    TEXT NOT NULL,
  -- Pricing
  currency            TEXT NOT NULL DEFAULT 'GBP',
  subtotal            NUMERIC(10,2) NOT NULL,
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  -- Codes applied
  discount_code_id    UUID REFERENCES discount_codes(id),
  voucher_id          UUID REFERENCES gift_vouchers(id),
  voucher_amount_used NUMERIC(10,2) DEFAULT 0,
  -- Payment
  payment_method      TEXT,               -- 'stripe', 'paypal'
  payment_intent_id   TEXT,               -- Stripe PaymentIntent or PayPal order ID
  paid_at             TIMESTAMPTZ,
  -- Shipping method
  shipping_method_id  UUID REFERENCES shipping_methods(id),
  tracking_number     TEXT,
  tracking_carrier    TEXT,
  dispatched_at       TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  -- Meta
  notes               TEXT,
  referral_source     TEXT,                      -- 'Instagram', 'Google', etc. (guest only)
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(10,2) NOT NULL,
  discount_pct  NUMERIC(5,2) DEFAULT 0,
  total_price   NUMERIC(10,2) NOT NULL,
  -- Uploaded image references
  image_key     TEXT NOT NULL,            -- S3 key for uploaded original
  print_file_key TEXT,                   -- S3 key for processed print-ready file
  crop_data     JSONB,                   -- { x, y, width, height, scale, rotation }
  image_quality TEXT CHECK (image_quality IN ('good','warn','blocked')),
  image_dpi     INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Abandoned Carts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      TEXT UNIQUE NOT NULL,
  email           TEXT,
  cart_data       JSONB NOT NULL DEFAULT '{}',
  recovery_email_sent_at TIMESTAMPTZ,
  converted       BOOLEAN DEFAULT FALSE,
  last_activity   TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reviews ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES products(id),
  order_id    UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  verified_purchase BOOLEAN DEFAULT FALSE,
  approved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sessions / Refresh Tokens ───────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed: initial product ───────────────────────────────────
INSERT INTO product_categories (slug, name, description)
VALUES ('magnets', 'Photo Magnets', 'Personalised photo magnets for your fridge or any magnetic surface')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (
  category_id, slug, name, description,
  width_mm, height_mm, min_dpi, warn_dpi, target_dpi,
  base_price_gbp, base_price_eur
)
SELECT
  c.id,
  'photo-magnet-50mm',
  '50mm Photo Magnet',
  'A personalised 50mm x 50mm square photo magnet. Perfect for fridges, lockers, and magnetic boards.',
  50, 50, 100, 150, 300,
  2.99, 3.49
FROM product_categories c
WHERE c.slug = 'magnets'
ON CONFLICT (slug) DO NOTHING;

-- Bulk discount tiers for the magnet
INSERT INTO bulk_discount_tiers (product_id, min_qty, max_qty, discount_pct, label, sort_order)
SELECT p.id, 5,  9,  10, 'Buy 5–9, save 10%',  1 FROM products p WHERE p.slug = 'photo-magnet-50mm'
ON CONFLICT DO NOTHING;
INSERT INTO bulk_discount_tiers (product_id, min_qty, max_qty, discount_pct, label, sort_order)
SELECT p.id, 10, 19, 15, 'Buy 10–19, save 15%', 2 FROM products p WHERE p.slug = 'photo-magnet-50mm'
ON CONFLICT DO NOTHING;
INSERT INTO bulk_discount_tiers (product_id, min_qty, max_qty, discount_pct, label, sort_order)
SELECT p.id, 20, NULL, 20, 'Buy 20+, save 20%', 3 FROM products p WHERE p.slug = 'photo-magnet-50mm'
ON CONFLICT DO NOTHING;

-- Shipping zones
INSERT INTO shipping_zones (name, countries, currency) VALUES
  ('UK Mainland', ARRAY['GB'], 'GBP'),
  ('Isle of Man', ARRAY['IM'], 'GBP'),
  ('Republic of Ireland', ARRAY['IE'], 'EUR')
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session ON abandoned_carts(session_id);
