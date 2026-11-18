CREATE INDEX CONCURRENTLY IF NOT EXISTS publish_records_task_idx ON publish_records (task_id, created_at DESC);
