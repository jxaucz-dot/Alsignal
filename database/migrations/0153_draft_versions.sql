-- Immutable generated or manually edited versions of a content draft.
CREATE TABLE draft_versions (
  draft_id       text NOT NULL REFERENCES content_drafts (id) ON DELETE CASCADE,
  version        integer NOT NULL CHECK (version > 0),
  title          text NOT NULL DEFAULT '',
  summary        text NOT NULL DEFAULT '',
  body           text NOT NULL DEFAULT '',
  cover_prompt   text,
  model          text,
  prompt_version text,
  source_material jsonb NOT NULL DEFAULT '{}',
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, version)
);
