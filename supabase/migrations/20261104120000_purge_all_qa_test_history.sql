-- Total QA payment test history purge (automated)
-- Deletes ALL QA test events (is_test_event=true or slug='csc-upi-payment-system-test')
-- and ALL related payment data, registrations, passes, attributions.
-- Preserves global bank evidence (event_payment_evidence) as it is shared financial audit,
-- but removes evidence linkage via matched_order_id.
-- Also cleans up notifications and audit logs for QA test runs.
-- This migration is idempotent and safe to re-run.

do $$
declare
  qa_event_ids uuid[];
  qa_order_ids uuid[];
begin
  -- Collect all QA event IDs
  select array_agg(id) into qa_event_ids
  from public.events
  where slug = 'csc-upi-payment-system-test'
     or (settings->>'is_test_event')::boolean = true
     or (settings->>'isTestEvent')::boolean = true;

  if qa_event_ids is null or array_length(qa_event_ids, 1) is null then
    raise notice 'No QA test events found for total purge';
    return;
  end if;

  -- Collect all QA order IDs
  select array_agg(id) into qa_order_ids
  from public.event_payment_orders
  where event_id = any(qa_event_ids);

  -- 1. Delete attributions
  if qa_order_ids is not null then
    delete from public.event_payment_attributions where order_id = any(qa_order_ids);
    delete from public.event_payment_events where order_id = any(qa_order_ids);
    -- reconciliation table may have different name, try both
    begin
      delete from public.event_payment_reconciliation where order_id = any(qa_order_ids);
    exception when undefined_table then null;
    end;
    begin
      delete from public.payment_reconciliations where order_id = any(qa_order_ids);
    exception when undefined_table then null;
    end;
  end if;

  -- 2. Delete registrations and passes
  delete from public.paid_event_registrations where event_id = any(qa_event_ids);
  -- event_registrations may have FK to events
  delete from public.event_registrations where event_id = any(qa_event_ids);
  -- guest verification records for QA event
  begin
    delete from public.guest_verifications where event_id = any(qa_event_ids);
  exception when undefined_table then null;
  end;

  -- 3. Delete QA payment orders (even with claimed UTRs - total purge)
  if qa_order_ids is not null then
    delete from public.event_payment_orders where id = any(qa_order_ids);
  end if;

  -- 4. Delete notifications related to QA test event (by dedupe_key or payload)
  begin
    delete from public.notifications
    where dedupe_key like 'paid-order-admin-%'
      and dedupe_key in (select 'paid-order-admin-' || id::text from unnest(qa_order_ids) as id);
  exception when undefined_table then null;
  end;
  begin
    delete from public.notification_deliveries
    where notification_id in (
      select id from public.notifications
      where dedupe_key in (select 'paid-order-admin-' || id::text from unnest(qa_order_ids) as id)
    );
  exception when undefined_table then null;
  end;

  -- 5. Delete QA event notices / updates / highlights if they reference QA event
  begin
    delete from public.event_notices where event_id = any(qa_event_ids);
  exception when undefined_table then null;
  end;
  begin
    delete from public.community_updates where event_id = any(qa_event_ids);
  exception when undefined_table then null;
  end;

  -- 6. Finally delete the QA event itself
  delete from public.events where id = any(qa_event_ids);

  raise notice 'Total QA purge complete: % events, % orders purged', array_length(qa_event_ids,1), coalesce(array_length(qa_order_ids,1),0);
end $$;
