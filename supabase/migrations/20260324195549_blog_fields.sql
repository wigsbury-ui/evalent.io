-- Add blog publishing fields to content_posts
ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blog_category TEXT DEFAULT 'admissions-strategy',
  ADD COLUMN IF NOT EXISTS reading_time INT DEFAULT 5;

-- Unique index on slug for published posts
CREATE UNIQUE INDEX IF NOT EXISTS content_posts_slug_unique
  ON content_posts (slug)
  WHERE slug IS NOT NULL AND status = 'published';

-- Allow public read of published blog posts
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public can read published blog posts"
  ON content_posts FOR SELECT
  USING (type = 'blog' AND status = 'published');

-- Supabase storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('blog-images', 'blog-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public can read blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY IF NOT EXISTS "Service role can insert blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-images');
