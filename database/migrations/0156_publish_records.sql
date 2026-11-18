-- Append-only attempts and provider responses for publish tasks.
CREATE TABLE publish_records (
  id            bigserial PRIMARY KEY,
  task_id       text NOT NULL REFERENCES publish_tasks (id) ON DELETE CASCADE,
  channel       text NOT NULL CHECK (channel IN ('wechat', 'x', 'feishu')),
  status        text NOT NULL CHECK (status IN ('started', 'succeeded', 'failed')),
  external_id   text,
  response      jsonb,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
