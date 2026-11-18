-- User-created content production drafts that start from a source item or manual material.
CREATE TABLE content_drafts (
  id                 text PRIMARY KEY CHECK (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  source_article_id  text REFERENCES articles (id) ON DELETE SET NULL,
  source_url         text,
  input_text         text NOT NULL DEFAULT '',
  requested_direction text,
  target_channels    text[] NOT NULL DEFAULT '{}',
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'publishing', 'published', 'rejected', 'failed')),
  current_version    integer NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  created_by         text,
  metadata           jsonb NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
