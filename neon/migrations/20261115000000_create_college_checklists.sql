CREATE TABLE IF NOT EXISTS public.college_checklists (
  user_id text PRIMARY KEY,
  schools jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT college_checklists_schools_is_array
    CHECK (jsonb_typeof(schools) = 'array')
);
