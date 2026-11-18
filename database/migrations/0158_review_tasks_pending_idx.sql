CREATE INDEX CONCURRENTLY IF NOT EXISTS review_tasks_pending_idx ON review_tasks (created_at DESC) WHERE status = 'pending';
