import { describe, expect, it } from 'vitest';
import { toDateOnlyOrNull, validDate } from '@/lib/dateGuards';

describe('validDate', () => {
  it('devolve a mesma instância quando a data é válida', () => {
    const date = new Date('1990-05-15T03:00:00.000Z');
    expect(validDate(date)).toBe(date);
  });

  it('devolve undefined para Invalid Date e para undefined', () => {
    expect(validDate(new Date(NaN))).toBeUndefined();
    expect(validDate(undefined)).toBeUndefined();
  });
});

describe('toDateOnlyOrNull', () => {
  it('mantém a serialização de antes (dia em UTC, como toISOString().split("T")[0])', () => {
    expect(toDateOnlyOrNull(new Date('1990-05-15T03:00:00.000Z'))).toBe('1990-05-15');
    expect(toDateOnlyOrNull(new Date('1990-05-15T00:00:00.000Z'))).toBe('1990-05-15');
  });

  it('devolve null para Invalid Date (antes: RangeError no envio) e para undefined', () => {
    expect(toDateOnlyOrNull(new Date(NaN))).toBeNull();
    expect(toDateOnlyOrNull(undefined)).toBeNull();
  });
});
