-- Create table: ai_rules
create table if not exists ai_rules (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references companies(id) on delete cascade,
    category text not null,                -- e.g. PAYE, NI, Pension
    title text not null,                   -- short label
    content text not null,                 -- rule text
    source_url text,                       -- HMRC or internal link
    embedding vector(1536),                -- for pgvector retrieval
    created_at timestamptz default now()
);

-- Index for fast retrieval
create index if not exists ai_rules_company_idx on ai_rules(company_id);
create index if not exists ai_rules_category_idx on ai_rules(category);
-- create ai_rules table
