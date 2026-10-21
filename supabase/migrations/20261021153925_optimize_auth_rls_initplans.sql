-- Evaluate the stable request identity once per statement rather than once
-- per candidate row. These policy predicates preserve the same ownership
-- and role logic; only auth.uid() evaluation is wrapped as an initplan.
do $$
declare
  policy_row record;
  alter_sql text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where policyname = any (array[
      'profiles_select_own', 'profiles_insert_own', 'profiles_update_own',
      'memberships_select_own', 'claims_select_own', 'reg_select_own',
      'consult_select_own', 'reviews_select_own', 'admin_roles_select_own',
      'claims_insert_own', 'reviews_insert_own', 'reviews_update_own',
      'dir_insert_own', 'dir_update_own', 'consult_insert_own',
      'attendance_read', 'event_staff_read', 'payments_read',
      'dir_select_published', 'member_resumes_select_own',
      'member_resumes_insert_own', 'member_resumes_update_own',
      'notification_member_inbox_read', 'notification_member_read_state'
    ])
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
      and (
        qual is null
        or qual !~* '\(\s*select\s+auth\.uid\s*\('
      )
      and (
        with_check is null
        or with_check !~* '\(\s*select\s+auth\.uid\s*\('
      )
  loop
    alter_sql := format(
      'alter policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );

    if policy_row.qual is not null then
      alter_sql := alter_sql || format(
        ' using (%s)',
        replace(policy_row.qual, 'auth.uid()', '(select auth.uid())')
      );
    end if;

    if policy_row.with_check is not null then
      alter_sql := alter_sql || format(
        ' with check (%s)',
        replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())')
      );
    end if;

    execute alter_sql;
  end loop;
end;
$$;
