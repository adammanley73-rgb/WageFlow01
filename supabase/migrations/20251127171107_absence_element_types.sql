-- C:\Users\adamm\Projects\wageflow01\supabase\migrations\20251127171107_absence_element_types.sql
-- Seed statutory absence-related pay element types.
-- Uses only the columns that exist on your current pay_element_types table.

insert into public.pay_element_types (
  code,
  name,
  side,
  taxable_for_paye,
  nic_earnings
) values
  -- Statutory Sick Pay
  ('SSP_BASIC', 'Statutory Sick Pay', 'earning', true, true),

  -- Statutory Maternity Pay
  ('SMP_BASIC', 'Statutory Maternity Pay', 'earning', true, true),

  -- Statutory Adoption Pay
  ('SAP_BASIC', 'Statutory Adoption Pay', 'earning', true, true),

  -- Statutory Paternity Pay
  ('SPP_BASIC', 'Statutory Paternity Pay', 'earning', true, true),

  -- Statutory Shared Parental Pay
  ('ShPP_BASIC', 'Statutory Shared Parental Pay', 'earning', true, true),

  -- Statutory Parental Bereavement Pay
  ('SPBP_BASIC', 'Statutory Parental Bereavement Pay', 'earning', true, true),

  -- Neonatal Care Pay
  ('NEONATAL_BASIC', 'Statutory Neonatal Care Pay', 'earning', true, true),

  -- Holiday pay for annual leave
  ('HOLIDAY_PAY', 'Holiday Pay', 'earning', true, true),

  -- Unpaid absence marker
  ('UNPAID_ABSENCE', 'Unpaid Absence', 'earning', false, false);
