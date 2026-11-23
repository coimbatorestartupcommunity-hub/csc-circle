-- ==============================================================================
-- Migration: 20261124000000_csc_agent_live_intelligence.sql
-- Description: Live Intelligence & Real-time Knowledge Engine tables,
--              triggers, verified member sessions, human escalation tickets,
--              and 5-minute automated atomic membership claims processor.
-- ==============================================================================

-- 1. Agent Change Outbox for universal website & DB change detection
CREATE TABLE IF NOT EXISTS public.csc_agent_change_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    change_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed'
    attempts INT NOT NULL DEFAULT 0,
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agent_change_outbox_status_created 
ON public.csc_agent_change_outbox (status, created_at ASC);

-- 2. Knowledge Documents Store (Public Level 1 & Member Level 2 Knowledge)
CREATE TABLE IF NOT EXISTS public.csc_agent_knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL, -- 'supabase', 'github', 'vercel', 'sitemap', 'admin'
    source_id TEXT NOT NULL,
    category TEXT NOT NULL, -- 'events', 'startups', 'updates', 'membership', 'general', 'governance', 'page'
    title TEXT NOT NULL,
    slug TEXT,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    tier INT NOT NULL DEFAULT 1, -- 1 = public, 2 = member-verified, 3 = internal
    is_published BOOLEAN NOT NULL DEFAULT true,
    checksum TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_knowledge_doc_source_source_id UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_category_published 
ON public.csc_agent_knowledge_documents (category, is_published, tier);

-- 3. Verified Member OTP Sessions for WhatsApp Sender Phone
CREATE TABLE IF NOT EXISTS public.csc_agent_verified_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_phone TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    member_number TEXT,
    email TEXT NOT NULL,
    otp_code_hash TEXT NOT NULL,
    otp_expires_at TIMESTAMPTZ NOT NULL,
    session_token TEXT,
    verified_at TIMESTAMPTZ,
    session_expires_at TIMESTAMPTZ,
    attempts_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agent_verified_sessions_phone 
ON public.csc_agent_verified_sessions (sender_phone, session_expires_at);

-- 4. Support Tickets for Human Escalation
CREATE SEQUENCE IF NOT EXISTS public.csc_agent_support_ticket_seq START 1001;

CREATE TABLE IF NOT EXISTS public.csc_agent_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE DEFAULT ('TICKET-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.csc_agent_support_ticket_seq'::regclass)::text, 4, '0')),
    sender_phone TEXT NOT NULL,
    user_id UUID,
    subject TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    assigned_to TEXT,
    conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agent_support_tickets_status 
ON public.csc_agent_support_tickets (status, priority, created_at DESC);

-- 5. GitHub and Vercel Deployment History
CREATE TABLE IF NOT EXISTS public.csc_agent_deployment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL, -- 'github', 'vercel'
    commit_sha TEXT NOT NULL,
    commit_message TEXT,
    author TEXT,
    branch TEXT,
    deployment_id TEXT,
    deployment_url TEXT,
    is_production BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed'
    files_changed JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agent_deployment_history_commit 
ON public.csc_agent_deployment_history (commit_sha, source);

-- 6. Trigger Function to enqueue changes to csc_agent_change_outbox
CREATE OR REPLACE FUNCTION public.csc_fn_capture_agent_change()
RETURNS TRIGGER AS $$
DECLARE
    entity_id_val TEXT;
    payload_val JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        entity_id_val := OLD.id::text;
        payload_val := jsonb_build_object('id', OLD.id);
    ELSE
        entity_id_val := NEW.id::text;
        payload_val := to_jsonb(NEW);
    END IF;

    INSERT INTO public.csc_agent_change_outbox (
        entity_type,
        entity_id,
        change_type,
        payload,
        status,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        entity_id_val,
        TG_OP,
        payload_val,
        'pending',
        timezone('utc'::text, now())
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on core content tables
DROP TRIGGER IF EXISTS trg_capture_events_change ON public.events;
CREATE TRIGGER trg_capture_events_change
    AFTER INSERT OR UPDATE OR DELETE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.csc_fn_capture_agent_change();

DROP TRIGGER IF EXISTS trg_capture_startups_change ON public.directory_startups;
CREATE TRIGGER trg_capture_startups_change
    AFTER INSERT OR UPDATE OR DELETE ON public.directory_startups
    FOR EACH ROW EXECUTE FUNCTION public.csc_fn_capture_agent_change();

DROP TRIGGER IF EXISTS trg_capture_reviews_change ON public.reviews;
CREATE TRIGGER trg_capture_reviews_change
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.csc_fn_capture_agent_change();

DROP TRIGGER IF EXISTS trg_capture_claims_change ON public.membership_claims;
CREATE TRIGGER trg_capture_claims_change
    AFTER INSERT OR UPDATE OR DELETE ON public.membership_claims
    FOR EACH ROW EXECUTE FUNCTION public.csc_fn_capture_agent_change();

DROP TRIGGER IF EXISTS trg_capture_memberships_change ON public.memberships;
CREATE TRIGGER trg_capture_memberships_change
    AFTER INSERT OR UPDATE OR DELETE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.csc_fn_capture_agent_change();

-- 7. Atomic 5-Minute Membership Approval Processor RPC
CREATE OR REPLACE FUNCTION public.csc_process_due_membership_claims()
RETURNS INT AS $$
DECLARE
    v_claim RECORD;
    v_member RECORD;
    v_approved_count INT := 0;
    v_highest_num TEXT;
    v_seq INT;
    v_new_member_number TEXT;
    v_verification_token TEXT;
    v_formatted_phone TEXT;
    v_whatsapp_body TEXT;
    v_footer TEXT := E'🚀 *Connect. Build. Grow.*\n*Coimbatore Startup Community (CSC Circle)*\n*Technical Partner: Logic Intelligence Technologies* 🤍';
BEGIN
    FOR v_claim IN
        SELECT c.id, c.user_id, c.full_name, c.whatsapp, c.linked_account_email, c.submitted_at
        FROM public.membership_claims c
        WHERE c.status IN ('claim_submitted', 'pending_verification')
          AND c.submitted_at <= (timezone('utc'::text, now()) - interval '5 minutes')
        ORDER BY c.submitted_at ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Check associated membership record
        SELECT m.id, m.member_number, m.status INTO v_member
        FROM public.memberships m
        WHERE m.user_id = v_claim.user_id
        FOR UPDATE;

        IF FOUND THEN
            -- Never reactivate suspended or revoked accounts
            IF v_member.status NOT IN ('suspended', 'revoked') THEN
                -- Determine member number
                v_new_member_number := v_member.member_number;
                IF v_new_member_number IS NULL OR v_new_member_number = '' THEN
                    SELECT member_number INTO v_highest_num
                    FROM public.memberships
                    WHERE member_number LIKE 'CSC-' || to_char(CURRENT_DATE, 'YYYY') || '-%'
                    ORDER BY member_number DESC
                    LIMIT 1;

                    IF v_highest_num IS NOT NULL THEN
                        v_seq := coalesce(substring(v_highest_num from 'CSC-[0-9]{4}-([0-9]+)')::int, 0) + 1;
                    ELSE
                        v_seq := 1;
                    END IF;
                    v_new_member_number := 'CSC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
                END IF;

                v_verification_token := encode(gen_random_bytes(16), 'hex');

                -- 1. Update membership_claims
                UPDATE public.membership_claims
                SET status = 'approved'
                WHERE id = v_claim.id;

                -- 2. Update memberships
                UPDATE public.memberships
                SET status = 'active',
                    member_number = v_new_member_number,
                    issued_at = timezone('utc'::text, now()),
                    verification_token = v_verification_token,
                    updated_at = timezone('utc'::text, now())
                WHERE user_id = v_claim.user_id;

                -- 3. Queue transactional WhatsApp notification if phone exists
                IF v_claim.whatsapp IS NOT NULL AND length(trim(v_claim.whatsapp)) >= 10 THEN
                    -- Clean phone format
                    v_formatted_phone := regexp_replace(v_claim.whatsapp, '[^0-9+]', '', 'g');
                    IF NOT v_formatted_phone LIKE '+%' THEN
                        IF length(v_formatted_phone) = 10 THEN
                            v_formatted_phone := '+91' || v_formatted_phone;
                        ELSE
                            v_formatted_phone := '+' || v_formatted_phone;
                        END IF;
                    END IF;

                    v_whatsapp_body := '🎉 *Congratulations ' || v_claim.full_name || '!*' || E'\n\n' ||
                        'Your *CSC Circle Membership* has been approved and activated!' || E'\n\n' ||
                        '💳 *Membership ID:* `' || v_new_member_number || '`' || E'\n' ||
                        '👤 *Account:* ' || v_claim.linked_account_email || E'\n' ||
                        '🔗 *View Your Digital Pass:* https://csc.logicintelligencetechnologies.in/member/card' || E'\n\n' ||
                        'Welcome to the ecosystem! Feel free to chat with this assistant 24/7 for events, startup directories, and community networking.' || E'\n\n' ||
                        v_footer;

                    INSERT INTO public.whatsapp_message_outbox (
                        recipient_phone,
                        message_body,
                        idempotency_key,
                        status
                    ) VALUES (
                        v_formatted_phone,
                        v_whatsapp_body,
                        'membership-approval-' || v_claim.id::text,
                        'pending'
                    ) ON CONFLICT (idempotency_key) DO NOTHING;
                END IF;

                v_approved_count := v_approved_count + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN v_approved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Helper RPC: Claim Agent Change Outbox Batch
CREATE OR REPLACE FUNCTION public.claim_agent_change_outbox_batch(
    p_batch_size INT DEFAULT 20
)
RETURNS SETOF public.csc_agent_change_outbox AS $$
BEGIN
    RETURN QUERY
    WITH batch AS (
        SELECT id
        FROM public.csc_agent_change_outbox
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.csc_agent_change_outbox o
    SET status = 'processing',
        attempts = o.attempts + 1
    FROM batch
    WHERE o.id = batch.id
    RETURNING o.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Helper RPC: Update Agent Change Outbox Status
CREATE OR REPLACE FUNCTION public.update_agent_change_outbox_status(
    p_change_id UUID,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.csc_agent_change_outbox
    SET status = p_status,
        error_message = p_error_message,
        processed_at = CASE WHEN p_status IN ('processed', 'failed') THEN timezone('utc'::text, now()) ELSE processed_at END
    WHERE id = p_change_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Helper RPC: Create Support Ticket
CREATE OR REPLACE FUNCTION public.create_agent_support_ticket(
    p_sender_phone TEXT,
    p_subject TEXT,
    p_summary TEXT,
    p_priority TEXT DEFAULT 'medium',
    p_conversation_history JSONB DEFAULT '[]'::jsonb,
    p_user_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_ticket_number TEXT;
BEGIN
    INSERT INTO public.csc_agent_support_tickets (
        sender_phone,
        user_id,
        subject,
        summary,
        priority,
        conversation_history
    ) VALUES (
        p_sender_phone,
        p_user_id,
        p_subject,
        p_summary,
        p_priority,
        p_conversation_history
    )
    RETURNING ticket_number INTO v_ticket_number;

    RETURN v_ticket_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.csc_agent_change_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csc_agent_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csc_agent_verified_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csc_agent_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csc_agent_deployment_history ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies
CREATE POLICY "Service role full access on csc_agent_change_outbox"
ON public.csc_agent_change_outbox FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on csc_agent_knowledge_documents"
ON public.csc_agent_knowledge_documents FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on csc_agent_verified_sessions"
ON public.csc_agent_verified_sessions FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on csc_agent_support_tickets"
ON public.csc_agent_support_tickets FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on csc_agent_deployment_history"
ON public.csc_agent_deployment_history FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Public read access on published Level 1 Knowledge Documents
CREATE POLICY "Public read published Level 1 Knowledge"
ON public.csc_agent_knowledge_documents FOR SELECT
USING (is_published = true AND tier = 1);
