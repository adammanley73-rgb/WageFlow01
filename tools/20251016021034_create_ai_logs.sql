-- Create table: ai_logs
create table if not exists ai_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references companies(id) on delete cascade,
    user_id uuid references auth.users(id),
    feature text not null,             -- 'copilot' or 'anomaly'
    input_text text not null,          -- redacted query
    output_text text,                  -- model response
    citations jsonb,                   -- [{title, source_url}]
    latency_ms integer,
    tokens_used integer,
    created_at timestamptz default now()
);

create index if not exists ai_logs_company_idx on ai_logs(company_id);
create index if not exists ai_logs_feature_idx on ai_logs(feature);
-- create ai_logs table
