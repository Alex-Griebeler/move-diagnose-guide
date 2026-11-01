// @vitest-environment jsdom
// F-01, tela: o Calendar nunca recebe Invalid Date em `selected` nem em `month`.
// Arquivo separado porque o vi.mock vale para o arquivo inteiro (personalDataStep.test.tsx usa o Calendar real).
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PersonalDataStep } from '@/components/anamnesis/steps/PersonalDataStep';
import type { AnamnesisData } from '@/components/anamnesis/AnamnesisWizard';

const h = vi.hoisted(() => ({ calls: [] as Array<{ selected: unknown; month: unknown }> }));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: (props: { selected?: unknown; month?: unknown }) => {
    h.calls.push({ selected: props.selected, month: props.month });
    return <div>calendário (stub)</div>;
  },
}));

beforeEach(() => {
  h.calls = [];
});
afterEach(cleanup);

const data = (birthDate: Date | undefined) =>
  ({ birthDate, weightKg: '', heightCm: '', laterality: '', occupation: '' }) as unknown as AnamnesisData;

function lastCalendarProps() {
  expect(h.calls.length).toBeGreaterThan(0);
  return h.calls[h.calls.length - 1];
}

it('Invalid Date: selected undefined e month válido em janeiro de 1990', () => {
  render(<PersonalDataStep data={data(new Date(NaN))} updateData={() => {}} />);
  fireEvent.click(screen.getByText('Selecione a data'));
  const { selected, month } = lastCalendarProps();
  expect(selected).toBeUndefined();
  expect(month).toBeInstanceOf(Date);
  expect((month as Date).getTime()).not.toBeNaN();
  expect([(month as Date).getFullYear(), (month as Date).getMonth()]).toStrictEqual([1990, 0]);
});

it('data válida: selected é a mesma instância e month cai no mesmo mês', () => {
  const birthDate = new Date(1990, 4, 15);
  render(<PersonalDataStep data={data(birthDate)} updateData={() => {}} />);
  fireEvent.click(screen.getByText('15/05/1990'));
  const { selected, month } = lastCalendarProps();
  expect(selected).toBe(birthDate);
  expect([(month as Date).getFullYear(), (month as Date).getMonth()]).toStrictEqual([1990, 4]);
});
