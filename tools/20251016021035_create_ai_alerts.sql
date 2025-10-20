-- Create table: ai_alerts
create table if not exists ai_alerts (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references companies(id) on delete cascade,
    pay_run_id uuid references pay_runs(id) on delete cascade,
    employee_id uuid references employees(id) on delete cascade,
    rule_name text not null,          -- e.g. 'NI spike', 'Zero net pay'
    reason text not null,             -- description of trigger
    value_before numeric,
    value_after numeric,
    severity text check (severity in ('low','medium','high')) default 'medium',
    resolved boolean default false,
    created_at timestamptz default now()
);

create index if not exists ai_alerts_company_idx on ai_alerts(company_id);
create index if not exists ai_alerts_run_idx on ai_alerts(pay_run_id);
-- create ai_alerts table
