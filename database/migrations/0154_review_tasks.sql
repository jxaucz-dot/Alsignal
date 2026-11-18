-- Human review decisions for a specific draft version.
CREATE TABLE review_tasks (
  id           text PRIMARY KEY CHECK (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  draft_id     text NOT NULL REFERENCES content_drafts (id) ON DELETE CASCADE,
  version      integer NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested', 'rejected', 'cancelled')),
  reviewer     text,
  decision     text,
  feedback     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  decided_at   timestamptz,
  FOREIGN KEY (draft_id, version) REFERENCES draft_versions (draft_id, version)
);
