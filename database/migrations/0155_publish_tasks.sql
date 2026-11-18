-- One publish task per target channel and approved draft version.
CREATE TABLE publish_tasks (
  id           text PRIMARY KEY CHECK (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  draft_id     text NOT NULL REFERENCES content_drafts (id) ON DELETE CASCADE,
  version      integer NOT NULL,
  channel      text NOT NULL CHECK (channel IN ('wechat', 'x', 'feishu')),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  external_id  text,
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (draft_id, version) REFERENCES draft_versions (draft_id, version)
);
