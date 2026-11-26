-- Digital Agreements & Electronic Execution System
-- Supports 7 agreement types, immutable post-sign snapshots, SHA-256 audit hashes,
-- optional partner logos, and IT Act 2000 / Evidence Act Section 65B audit trails.

create table if not exists public.digital_agreements (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  agreement_type text not null check (
    agreement_type in (
      'tech_partner',
      'leadership_charter',
      'strategic_mou',
      'event_collaboration',
      'sponsorship',
      'speaker_mentor',
      'custom'
    )
  ),
  title text not null,
  subtitle text not null default '',
  eyebrow text not null default '',
  recipient_name text not null,
  recipient_email text not null,
  recipient_role text not null default '',
  recipient_org text not null default '',
  recipient_whatsapp text not null default '',
  leadership_role text,
  effective_date date not null default current_date,
  duration_label text not null default '12 Months',
  form_data jsonb not null default '{}'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  csc_signatory_name text not null default 'K. N. Reyash',
  csc_signatory_role text not null default 'Founder, Coimbatore Startup Community',
  signing_token text not null unique,
  status text not null default 'sent' check (status in ('draft', 'sent', 'signed', 'voided', 'expired')),
  expires_at timestamptz,
  partner_logo_path text,
  signed_name text,
  signed_email text,
  signed_role text,
  signed_org text,
  signed_at timestamptz,
  signed_ip text,
  signed_user_agent text,
  signed_user_id uuid references auth.users(id) on delete set null,
  document_hash text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_digital_agreements_status on public.digital_agreements (status, created_at desc);
create index if not exists idx_digital_agreements_email on public.digital_agreements (lower(recipient_email));

alter table public.digital_agreements enable row level security;

-- Lock down direct client access; all reads/writes go through authenticated server routes
revoke all on table public.digital_agreements from anon, authenticated;

-- Private storage bucket for optional partner logos uploaded during agreement signing
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agreement-assets',
  'agreement-assets',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
