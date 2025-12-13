# WageFlow – Absence Overlap Rules (v1)

Context  
These rules apply per employee, per company.  
All dates are treated as whole days and inclusive (start and end dates are both working days in the absence).

General principles  
1. No overlapping active absences for the same employee.  
2. Back-to-back absences are allowed (one ends on day N, the next can start on day N+1).  
3. “Overlapping” means at least one calendar day is shared between two absences, including same-day overlaps.  
4. Soft-deleted / cancelled absences (cancelled_at is not null) are ignored in overlap checks.

Absence types (current)  
- sickness  
- annual_leave  
- maternity  
- adoption  
- paternity  
- shared_parental  
- parental_bereavement  
- neonatal  
- unpaid_leave  
- other

Canonical date fields for overlap

start_date_column: first_day

end_date_column:

Use last_day_actual if it is not null

Otherwise use last_day_expected if it is not null

Otherwise use first_day

All overlap checks use this range:
[first_day, effective_end_date] on inclusive calendar days.

This applies to all absence types:
sickness, annual_leave, maternity, adoption, paternity, shared_parental, parental_bereavement, neonatal, unpaid_leave, other.

## 1. Global overlap rule

For any two active absences for the same employee:

- If their date ranges overlap by at least one day, the new or edited absence is invalid.  
- This applies regardless of absence type.

In other words:  
- You cannot have sickness and annual leave on the same day.  
- You cannot have sickness and maternity covering the same day.  
- You cannot have two annual leave bookings that share a day.  
- You cannot stack multiple statutory absences at once.

Back-to-back is allowed:  
- Example allowed:  
  - Annual leave: 01/05/2025 to 05/05/2025  
  - Sickness: 06/05/2025 to 10/05/2025  

Example blocked:  
- Annual leave: 01/05/2025 to 05/05/2025  
- Sickness: 05/05/2025 to 10/05/2025  
(They both include 05/05/2025.)

## 2. Type-specific notes (v1)

These notes describe intent; the enforcement is still the single global rule above.

### 2.1 Sickness (SSP-relevant)

- No overlapping sickness spells are allowed.  
- Sickness cannot overlap any other absence type.  
- Continuous sickness should be recorded as one spell, not multiple overlapping ones.  
- For linked SSP spells (short gaps), separate logic will decide linking, NOT overlapping absences.

### 2.2 Annual leave (holiday pay)

- No overlapping annual leave bookings.  
- Annual leave cannot overlap sickness or any statutory absence (maternity, paternity, etc).  
- If sickness occurs during planned annual leave, the user must adjust dates so they do not overlap.

### 2.3 Maternity / adoption / shared parental

- These periods are exclusive.  
- They cannot overlap any other absence type.  
- If an employee is on maternity, you cannot record separate sickness days within the same dates.

### 2.4 Paternity, parental bereavement, neonatal

- These are also treated as exclusive.  
- They cannot overlap sickness, annual leave, maternity/adoption/shared parental, or each other.

### 2.5 Unpaid leave and other

- For v1, unpaid_leave and other follow the same global rule: they cannot overlap any other active absence.  
- This keeps the engine simple and the behaviour predictable for SMEs.

## 3. Technical rule for the backend

For an employee’s new or edited absence with:

- proposed_start_date  
- proposed_end_date

We consider an overlap with an existing active absence where:

- existing_start_date <= proposed_end_date  
AND  
- existing_end_date   >= proposed_start_date  

If any such record exists (ignoring cancelled absences and the current record when editing), the operation fails with a validation error.

## 4. Future refinements (v2+)

Later versions may relax these rules for:

- Informational absences that do not affect pay.  
- More nuanced handling of unpaid leave or “other”.  

For now, v1 keeps a single simple rule: **one active absence at a time per employee**.
