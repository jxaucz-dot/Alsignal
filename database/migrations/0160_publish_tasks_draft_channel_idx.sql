CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS publish_tasks_draft_channel_version_idx ON publish_tasks (draft_id, version, channel) WHERE status <> 'cancelled';
