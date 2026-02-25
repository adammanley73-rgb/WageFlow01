-- C:\Projects\wageflow01\supabase\migrations\20260225195500_absences_add_bereaved_partners_paternity.sql

begin;

alter table public.absences
  drop constraint if exists absences_type_check;

alter table public.absences
  add constraint absences_type_check
  check (
    (type is null)
    or (type = any (array[
      'annual_leave'::text,
      'sickness'::text,
      'maternity'::text,
      'paternity'::text,
      'shared_parental'::text,
      'adoption'::text,
      'parental_bereavement'::text,
      'unpaid_leave'::text,
      'bereaved_partners_paternity'::text
    ]))
  );

commit;
