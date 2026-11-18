CREATE INDEX CONCURRENTLY IF NOT EXISTS publish_tasks_due_idx ON publish_tasks (scheduled_at, created_at) WHERE status IN ('pending', 'failed');
