-- Migration: Extend member_designation enum with active founder personas
-- Description: Adds 'founder', 'early_entrepreneur', 'entrepreneur', 'business_person', and 'innovator'
-- to public.member_designation enum to match active founder personas in UI and membership claim forms.

DO $$
BEGIN
  ALTER TYPE public.member_designation ADD VALUE IF NOT EXISTS 'founder';
  ALTER TYPE public.member_designation ADD VALUE IF NOT EXISTS 'early_entrepreneur';
  ALTER TYPE public.member_designation ADD VALUE IF NOT EXISTS 'entrepreneur';
  ALTER TYPE public.member_designation ADD VALUE IF NOT EXISTS 'business_person';
  ALTER TYPE public.member_designation ADD VALUE IF NOT EXISTS 'innovator';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
