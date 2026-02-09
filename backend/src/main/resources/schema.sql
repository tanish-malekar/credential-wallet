CREATE TABLE IF NOT EXISTS credential (
 id UUID PRIMARY KEY,
 member_id TEXT NOT NULL,
 title TEXT NOT NULL,
 kind TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'ACTIVE',
 issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '90 days',
 UNIQUE(member_id,kind)
);
CREATE TABLE IF NOT EXISTS consent (
 member_id TEXT PRIMARY KEY,
 profile_allowed BOOLEAN NOT NULL,
 email_allowed BOOLEAN NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
