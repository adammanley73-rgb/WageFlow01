-- Enable Row Level Security
alter table ai_rules enable row level security;
alter table ai_logs enable row level security;
alter table ai_alerts enable row level security;

-- Simplified policy for company-scoped access
create policy "company_read_own_rules"
    on ai_rules for select
    using (auth.uid() in (
        select user_id from company_memberships
        where company_id = ai_rules.company_id
    ));

create policy "company_insert_own_rules"
    on ai_rules for insert
    with check (auth.uid() in (
        select user_id from company_memberships
        where company_id = ai_rules.company_id
    ));

create policy "company_read_own_logs"
    on ai_logs for select
    using (auth.uid() in (
        select user_id from company_memberships
        where company_id = ai_logs.company_id
    ));

create policy "company_read_own_alerts"
    on ai_alerts for select
    using (auth.uid() in (
        select user_id from company_memberships
        where company_id = ai_alerts.company_id
    ));
