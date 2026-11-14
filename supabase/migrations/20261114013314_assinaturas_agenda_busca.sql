CREATE TABLE portal_signatures (
 id serial PRIMARY KEY,id_lawyer integer NOT NULL REFERENCES lawyers(id),id_costumer integer NOT NULL REFERENCES costumers(id),
 title text NOT NULL,body text NOT NULL,token_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 original_pdf bytea NOT NULL,original_hash text NOT NULL,signed_pdf bytea,signed_hash text,signed_at timestamptz,evidence jsonb,
 CHECK ((signed_at IS NULL AND signed_pdf IS NULL AND evidence IS NULL) OR (signed_at IS NOT NULL AND signed_pdf IS NOT NULL AND evidence IS NOT NULL))
);
CREATE INDEX portal_signatures_owner ON portal_signatures(id_lawyer,id_costumer);
CREATE TABLE portal_access_logs(id bigserial PRIMARY KEY,id_user integer REFERENCES users(id),action text NOT NULL,resource_id integer,ip varchar(64),device varchar(500),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX portal_access_logs_created ON portal_access_logs(created_at);
ALTER TABLE process ADD COLUMN datajud_metadata jsonb;
CREATE TABLE portal_datajud_history(id bigserial PRIMARY KEY,id_process integer NOT NULL REFERENCES process(id),checked_at timestamptz NOT NULL DEFAULT now(),snapshot jsonb NOT NULL);
CREATE INDEX portal_datajud_history_process ON portal_datajud_history(id_process,checked_at DESC);
ALTER TABLE hearings ALTER COLUMN id_process DROP NOT NULL;
ALTER TABLE hearings ADD COLUMN id_lawyer integer REFERENCES lawyers(id),ADD COLUMN id_costumer integer REFERENCES costumers(id),ADD COLUMN duration_minutes integer NOT NULL DEFAULT 60 CHECK(duration_minutes BETWEEN 5 AND 480),ADD COLUMN cancelled_at timestamptz,ADD COLUMN revision integer NOT NULL DEFAULT 1,ADD COLUMN reminder_minutes integer NOT NULL DEFAULT 1440 CHECK(reminder_minutes BETWEEN 5 AND 10080);
UPDATE hearings h SET id_lawyer=p.id_lawyer,id_costumer=p.id_costumer FROM process p WHERE h.id_process=p.id;
ALTER TABLE hearings ALTER COLUMN id_lawyer SET NOT NULL,ALTER COLUMN id_costumer SET NOT NULL;
CREATE INDEX hearings_schedule ON hearings(date,id_lawyer,id_costumer) WHERE cancelled_at IS NULL;
CREATE TABLE portal_hearing_reminders(id bigserial PRIMARY KEY,id_hearing integer NOT NULL REFERENCES hearings(id),revision integer NOT NULL,id_user integer NOT NULL REFERENCES users(id),sent_at timestamptz,attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),last_error text,UNIQUE(id_hearing,revision,id_user));
CREATE INDEX portal_reminders_due ON portal_hearing_reminders(next_attempt_at) WHERE sent_at IS NULL;
CREATE OR REPLACE FUNCTION portal_search_text(value text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT translate(lower(coalesce(value,'')),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') $$;
REVOKE ALL ON FUNCTION portal_search_text(text) FROM PUBLIC;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['portal_signatures','portal_access_logs','portal_datajud_history','portal_hearing_reminders'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t); END LOOP; END $$;

INSERT INTO portal_hearing_reminders(id_hearing,revision,id_user)
SELECT h.id,h.revision,l.id_user FROM hearings h JOIN lawyers l ON l.id=h.id_lawyer WHERE h.date>=CURRENT_DATE
UNION SELECT h.id,h.revision,c.id_user FROM hearings h JOIN costumers c ON c.id=h.id_costumer WHERE h.date>=CURRENT_DATE
ON CONFLICT DO NOTHING;
