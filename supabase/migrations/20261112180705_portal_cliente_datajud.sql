-- Additive migration for the existing juridico database. Existing IDs/data are preserved.
CREATE TABLE public.portal_lawyer_clients (
 id_lawyer integer NOT NULL REFERENCES public.lawyers(id),
 id_costumer integer NOT NULL REFERENCES public.costumers(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(id_lawyer,id_costumer)
);
INSERT INTO public.portal_lawyer_clients(id_lawyer,id_costumer)
 SELECT DISTINCT id_lawyer,id_costumer FROM public.process ON CONFLICT DO NOTHING;
CREATE INDEX portal_lawyer_clients_customer_idx ON public.portal_lawyer_clients(id_costumer);
CREATE TABLE public.portal_sessions (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 id_user integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_sessions_user_idx ON public.portal_sessions(id_user);
CREATE INDEX portal_sessions_expiry_idx ON public.portal_sessions(expires_at);
CREATE TABLE public.portal_invites (
 id serial PRIMARY KEY,
 id_user integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL CHECK(length(token_hash)=64),
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_invites_user_idx ON public.portal_invites(id_user);
CREATE TABLE public.portal_messages (
 id serial PRIMARY KEY,
 id_process integer NOT NULL REFERENCES public.process(id),
 id_sender integer NOT NULL REFERENCES public.users(id),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_messages_process_idx ON public.portal_messages(id_process,id DESC);
CREATE INDEX portal_messages_sender_idx ON public.portal_messages(id_sender);
ALTER TABLE public.process ADD COLUMN datajud_tribunal text,
 ADD COLUMN datajud_checked_at timestamptz,
 ADD COLUMN datajud_updated_at timestamptz;
ALTER TABLE public.movements ADD COLUMN source text NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','datajud')),
 ADD COLUMN external_key text,
 ADD COLUMN source_occurred_at timestamptz;
CREATE UNIQUE INDEX movements_external_unique ON public.movements(id_process,external_key);
ALTER TABLE public.documents ADD COLUMN file bytea,
 ADD COLUMN mime_type text;
ALTER TABLE public.documents ALTER COLUMN file_path SET DEFAULT '';
ALTER TABLE public.documents ALTER COLUMN date_ass DROP NOT NULL;
COMMENT ON COLUMN public.documents.file IS 'Private binary served only after process authorization; maximum upload 5 MiB.';
COMMENT ON COLUMN public.documents.file_path IS 'Legacy path preserved. New uploads are held privately in file.';
CREATE INDEX process_lawyer_idx ON public.process(id_lawyer);
CREATE INDEX process_customer_idx ON public.process(id_costumer);
CREATE INDEX hearings_process_idx ON public.hearings(id_process);
CREATE INDEX documents_process_idx ON public.documents(id_process);
CREATE INDEX notifications_user_idx ON public.notifications(id_user,id DESC);
-- Abort instead of changing identities when pre-existing case-insensitive duplicates exist.
CREATE UNIQUE INDEX users_email_lower_unique ON public.users(lower(email));
-- This project uses server-side PostgreSQL sessions, not Supabase Auth JWTs.
-- The browser must never access these tables via the Supabase Data API.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_lawyer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users,public.lawyers,public.costumers,public.process,public.hearings,public.documents,public.movements,public.notifications,public.portal_lawyer_clients,public.portal_sessions,public.portal_invites,public.portal_messages FROM anon,authenticated;
-- Existing auto-RLS event trigger must not be callable as an exposed RPC.
DO $$ BEGIN
 IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
  REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC,anon,authenticated;
 END IF;
END $$;
