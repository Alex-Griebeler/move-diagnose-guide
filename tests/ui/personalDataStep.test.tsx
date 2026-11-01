// @vitest-environment jsdom
// F-01, tela: com Invalid Date, o passo de dados pessoais caía (format: RangeError) e o calendário ficava sem mês.
import { afterEach, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PersonalDataStep } from '@/components/anamnesis/steps/PersonalDataStep';
import type { AnamnesisData } from '@/components/anamnesis/AnamnesisWizard';

afterEach(cleanup);

const data = (birthDate: Date | undefined) =>
  ({ birthDate, weightKg: '', heightCm: '', laterality: '', occupation: '' }) as unknown as AnamnesisData;

it('Invalid Date com o calendário fechado: mostra "Selecione a data" sem lançar', () => {
  render(<PersonalDataStep data={data(new Date(NaN))} updateData={() => {}} />);
  screen.getByText('Selecione a data');
});

it('Invalid Date com o calendário aberto: abre em janeiro de 1990', () => {
  render(<PersonalDataStep data={data(new Date(NaN))} updateData={() => {}} />);
  fireEvent.click(screen.getByText('Selecione a data'));
  screen.getByRole('grid', { name: /janeiro 1990/i });
});

it('data válida: mostra dd/MM/yyyy e abre no mês da data', () => {
  render(<PersonalDataStep data={data(new Date(1990, 4, 15))} updateData={() => {}} />);
  fireEvent.click(screen.getByText('15/05/1990'));
  screen.getByRole('grid', { name: /maio 1990/i });
});
