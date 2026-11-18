CREATE INDEX CONCURRENTLY IF NOT EXISTS content_drafts_status_updated_idx ON content_drafts (status, updated_at DESC);
