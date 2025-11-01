-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251020131500_pre_run_validations_and_audit.sql
-- WageFlow — Pre-run validations + audit log (tables, indexes, RLS)

create extension if not exists pgcrypto;

create or replace function public.claim_company_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'company_id','')::uuid;
$$;

create or replace function public.claim_role()
returns text
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','');
$$;

create table if not exists public.pay_run_validations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  pay_run_id uuid null,
  employee_id uuid null,

  rule text not null,
  severity text not null check (severity in ('error','warning','info')),
  message text not null,

  pointers jsonb null,
  meta jsonb null,

  created_at timestamptz not null default now()
);

comment on table public.pay_run_validations is
  'Pre-run, non-blocking or blocking validation results captured before calculations.';

create index if not exists idx_prv_company on public.pay_run_validations (company_id);
create index if not exists idx_prv_pay_run on public.pay_run_validations (pay_run_id);
create index if not exists idx_prv_employee on public.pay_run_validations (employee_id);
create index if not exists idx_prv_created_at on public.pay_run_validations (created_at);
create index if not exists idx_prv_rule on public.pay_run_validations (rule);

create table if not exists public.pay_run_audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  pay_run_id uuid null,
  employee_id uuid null,
  actor_id uuid null,

  action text not null,
  rule text null,
  old_value jsonb null,
  new_value jsonb null,

  created_at timestamptz not null default now()
);

comment on table public.pay_run_audit_log is
  'Immutable audit events for payroll workflow and validation overrides.';

create index if not exists idx_pral_company on public.pay_run_audit_log (company_id);
create index if not exists idx_pral_pay_run on public.pay_run_audit_log (pay_run_id);
create index if not exists idx_pral_employee on public.pay_run_audit_log (employee_id);
create index if not exists idx_pral_created_at on public.pay_run_audit_log (created_at);
create index if not exists idx_pral_action on public.pay_run_audit_log (action);

alter table public.pay_run_validations enable row level security;
alter table public.pay_run_audit_log  enable row level security;

drop policy if exists prv_select_company on public.pay_run_validations;
create policy prv_select_company
on public.pay_run_validations
for select
to authenticated
using (company_id = public.claim_company_id());

drop policy if exists pral_select_company on public.pay_run_audit_log;
create policy pral_select_company
on public.pay_run_audit_log
for select
to authenticated
using (company_id = public.claim_company_id());

drop policy if exists prv_insert_admin on public.pay_run_validations;
create policy prv_insert_admin
on public.pay_run_validations
for insert
to authenticated
with check (
  company_id = public.claim_company_id()
  and public.claim_role() in ('owner','admin')
);

drop policy if exists pral_insert_admin on public.pay_run_audit_log;
create policy pral_insert_admin
on public.pay_run_audit_log
for insert
to authenticated
with check (
  company_id = public.claim_company_id()
  and public.claim_role() in ('owner','admin')
);

revoke all on public.pay_run_validations from authenticated;
revoke all on public.pay_run_audit_log  from authenticated;

grant select, insert on public.pay_run_validations to authenticated;
grant select, insert on public.pay_run_audit_log  to authenticated;
