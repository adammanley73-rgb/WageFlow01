New table: employee_tax_codes with the columns above.

New fields on payroll_runs: tax_year, tax_period.

Rule: employees.* only store “current” tax values, history lives in employee_tax_codes.

Rule: P6 will later create rows in employee_tax_codes as pending.

Rule: YTD comes from approved runs only.