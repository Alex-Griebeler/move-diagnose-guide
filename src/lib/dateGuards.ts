import { isValid } from 'date-fns';

// Returns the date only if it is valid, so an Invalid Date never reaches format() or toISOString()
export function validDate(value: Date | undefined): Date | undefined {
  return value && isValid(value) ? value : undefined;
}

// Same serialization the anamnesis already used for birth_date (UTC day), but null for invalid dates
export function toDateOnlyOrNull(value: Date | undefined): string | null {
  const date = validDate(value);
  return date ? date.toISOString().split('T')[0] : null;
}
