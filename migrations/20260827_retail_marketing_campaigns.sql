CREATE TABLE IF NOT EXISTS retail_marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
  subject_en TEXT NOT NULL CHECK(length(trim(subject_en)) BETWEEN 1 AND 160),
  subject_ar TEXT NOT NULL CHECK(length(trim(subject_ar)) BETWEEN 1 AND 160),
  body_en TEXT NOT NULL CHECK(length(trim(body_en)) BETWEEN 1 AND 8000),
  body_ar TEXT NOT NULL CHECK(length(trim(body_ar)) BETWEEN 1 AND 8000),
  cta_label_en TEXT CHECK(cta_label_en IS NULL OR length(trim(cta_label_en)) BETWEEN 1 AND 80),
  cta_label_ar TEXT CHECK(cta_label_ar IS NULL OR length(trim(cta_label_ar)) BETWEEN 1 AND 80),
  cta_url TEXT CHECK(cta_url IS NULL OR length(cta_url) BETWEEN 1 AND 2048),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','sending','completed','cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  idempotency_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK((status='scheduled')=(scheduled_at IS NOT NULL) OR status IN ('sending','completed','cancelled'))
);

CREATE TABLE IF NOT EXISTS retail_marketing_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES retail_marketing_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES retail_marketing_subscribers(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  locale TEXT NOT NULL CHECK(locale IN ('en','ar')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id,subscriber_id)
);

CREATE INDEX IF NOT EXISTS retail_marketing_campaign_due_idx ON retail_marketing_campaigns(status,scheduled_at);
CREATE INDEX IF NOT EXISTS retail_marketing_delivery_pending_idx ON retail_marketing_deliveries(status,available_at,created_at);
