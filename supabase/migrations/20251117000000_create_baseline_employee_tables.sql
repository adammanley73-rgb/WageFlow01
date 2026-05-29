-- Create baseline employees and payroll_run_employees tables
-- These must exist before 20251118234500_add_pay_elements.sql which references them.
-- Guarded because Supabase Preview may replay this migration before public.companies or public.payroll_runs exists.

create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null,
    first_name text not null,
    last_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

do $$
begin
    if to_regclass('public.companies') is not null then
        if not exists (
            select 1
            from pg_constraint
            where conname = 'employees_company_id_fkey'
        ) then
            alter table public.employees
            add constraint employees_company_id_fkey
            foreign key (company_id)
            references public.companies(id)
            on delete cascade;
        end if;
    end if;
end $$;

create index if not exists idx_employees_company_id
    on public.employees (company_id);

create table if not exists public.payroll_run_employees (
    id uuid primary key default gen_random_uuid(),
    run_id uuid not null,
    employee_id uuid not null,
    company_id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

do $$
begin
    if to_regclass('public.payroll_runs') is not null then
        if not exists (
            select 1
            from pg_constraint
            where conname = 'payroll_run_employees_run_id_fkey'
        ) then
            alter table public.payroll_run_employees
            add constraint payroll_run_employees_run_id_fkey
            foreign key (run_id)
            references public.payroll_runs(id)
            on delete cascade;
        end if;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'payroll_run_employees_employee_id_fkey'
    ) then
        alter table public.payroll_run_employees
        add constraint payroll_run_employees_employee_id_fkey
        foreign key (employee_id)
        references public.employees(id)
        on delete cascade;
    end if;
end $$;

do $$
begin
    if to_regclass('public.companies') is not null then
        if not exists (
            select 1
            from pg_constraint
            where conname = 'payroll_run_employees_company_id_fkey'
        ) then
            alter table public.payroll_run_employees
            add constraint payroll_run_employees_company_id_fkey
            foreign key (company_id)
            references public.companies(id)
            on delete cascade;
        end if;
    end if;
end $$;

create index if not exists idx_payroll_run_employees_run_id
    on public.payroll_run_employees (run_id);

create index if not exists idx_payroll_run_employees_employee_id
    on public.payroll_run_employees (employee_id);

create index if not exists idx_payroll_run_employees_company_run
    on public.payroll_run_employees (company_id, run_id);