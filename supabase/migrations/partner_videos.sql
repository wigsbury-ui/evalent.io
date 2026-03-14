
-- Partner Video Library
CREATE TABLE IF NOT EXISTS partner_videos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  vimeo_id     TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'General',
  thumbnail_url TEXT,
  is_live      BOOLEAN DEFAULT FALSE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_videos_live ON partner_videos(is_live);
CREATE INDEX IF NOT EXISTS idx_partner_videos_sort ON partner_videos(sort_order);
