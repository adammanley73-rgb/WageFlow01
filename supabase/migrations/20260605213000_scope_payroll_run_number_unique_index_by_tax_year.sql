drop index if exists public.uq_payroll_runs_company_run_number;

create unique index if not exists uq_payroll_runs_company_run_number_tax_year
on public.payroll_runs (
  company_id,
  run_number,
  (
    case
      when pay_date >= make_date(extract(year from pay_date)::integer, 4, 6)
        then extract(year from pay_date)::integer
      else extract(year from pay_date)::integer - 1
    end
  )
)
where company_id is not null
  and run_number is not null
  and pay_date is not null;

comment on index public.uq_payroll_runs_company_run_number_tax_year
is 'Ensures payroll run numbers are unique per company within a UK tax year, while allowing the same run number to recur in later tax years.';