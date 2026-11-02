// @vitest-environment jsdom
// F-04, anamnese: depois do envio o rascunho é apagado; ao voltar, o wizard abria vazio e o reenvio inseria
// outra linha. Agora ele carrega a anamnese salva e o reenvio regrava a mesma linha (upsert por avaliação).
// Reais: AnamnesisWizard, os passos e o useWizardPersistence. Falso: Supabase (tabelas preenchidas pelo teste,
// escritas registradas). Dados sintéticos.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RecordedWrite } from './supabaseFake';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';

const ASSESSMENT = '00000000-0000-0000-0000-0000000000c1';
const STUDENT = '00000000-0000-0000-0000-0000000000c2';
const OCCUPATION = 'Ex: Engenheiro, Professor, Atleta...';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  writes: [] as RecordedWrite[],
  toasts: [] as Array<{ title?: string }>,
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createSupabaseFake } = await import('./supabaseFake');
  return { supabase: createSupabaseFake(h.tables, h.writes) };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: (t: { title?: string }) => { h.toasts.push(t); } }),
}));

// Linha como o envio a grava; todos os campos que o wizard preenche, com valores sintéticos.
const SAVED = {
  assessment_id: ASSESSMENT,
  birth_date: '1990-05-15',
  weight_kg: 70.5,
  height_cm: 175,
  laterality: 'left',
  occupation: 'Ocupação sintética',
  pain_history: [{ region: 'lumbar', intensity: 4, duration: 'chronic', description: 'dor sintética' }],
  surgeries: [{ type: 'Cirurgia sintética', year: '2015', region: 'knee', laterality: 'right' }],
  red_flags: {
    unexplainedWeightLoss: false, nightPain: true, fever: false, bladderBowelDysfunction: false,
    progressiveWeakness: false, recentTrauma: false, cancerHistory: false, osteoporosis: false,
  },
  has_red_flags: true,
  sedentary_hours_per_day: 8,
  work_type: 'sitting',
  sleep_quality: 7,
  sleep_hours: 6.5,
  activity_frequency: 4,
  activity_types: ['strength', 'running'],
  activity_duration_minutes: 52,
  sports: [{ name: 'Esporte sintético', level: 'amateur', frequency: '2x' }],
  objectives: 'mobility; pain_reduction; objetivo livre sintético',
  time_horizon: '3months',
  lgpd_consent: true,
  lgpd_consent_date: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
  for (const table of Object.keys(h.tables)) delete h.tables[table];
  h.writes.length = 0;
  h.toasts.length = 0;
  h.tables.anamnesis_responses = (f: Record<string, unknown>) => (f.assessment_id === ASSESSMENT ? SAVED : null);
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const renderWizard = () => render(
  <MemoryRouter>
    <AnamnesisWizard assessmentId={ASSESSMENT} studentId={STUDENT} onComplete={() => {}} />
  </MemoryRouter>,
);

it('F-04: sem rascunho, a anamnese já enviada volta preenchida com o que foi salvo', async () => {
  renderWizard();
  await waitFor(() => expect(screen.getByLabelText('Peso (kg)')).toHaveProperty('value', '70.5'));
  expect(screen.getByPlaceholderText(OCCUPATION)).toHaveProperty('value', 'Ocupação sintética');
  // Os objetivos salvos voltam marcados; só o texto livre fica no campo de texto
  fireEvent.click(screen.getByRole('button', { name: /Objetivos/ }));
  await screen.findByDisplayValue('objetivo livre sintético');
});

it('F-04: reenviar regrava a mesma linha por avaliação, sem perder nenhum campo', async () => {
  renderWizard();
  await waitFor(() => expect(screen.getByLabelText('Peso (kg)')).toHaveProperty('value', '70.5'));
  fireEvent.click(screen.getByRole('button', { name: /LGPD/ }));
  const submit = await screen.findByRole('button', { name: /Concluir Anamnese/ });
  await waitFor(() => expect(submit).toHaveProperty('disabled', false));
  fireEvent.click(submit);

  await waitFor(() => expect(h.writes.some((w) => w.table === 'anamnesis_responses')).toBe(true));
  const written = h.writes.filter((w) => w.table === 'anamnesis_responses');
  expect(written).toHaveLength(1);
  expect(written[0].op).toBe('upsert');
  expect(written[0].options).toMatchObject({ onConflict: 'assessment_id' });
  // Tudo o que foi salvo volta igual; só a data do consentimento é a do novo envio
  const { lgpd_consent_date: _savedDate, ...savedFields } = SAVED;
  expect(written[0].payload).toMatchObject(savedFields);
});

it('F-04: com rascunho, o rascunho continua valendo (a anamnese salva não o sobrescreve)', async () => {
  h.tables.assessment_drafts = (f: Record<string, unknown>) => (
    f.assessment_id === ASSESSMENT && f.step_type === 'anamnesis'
      ? { draft_data: { weightKg: '80', occupation: 'Rascunho sintético', lgpdConsent: false }, current_step: 1 }
      : null
  );
  renderWizard();
  await waitFor(() => expect(screen.getByLabelText('Peso (kg)')).toHaveProperty('value', '80'));
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.getByLabelText('Peso (kg)')).toHaveProperty('value', '80');
  expect(screen.getByPlaceholderText(OCCUPATION)).toHaveProperty('value', 'Rascunho sintético');
});

it('F-04: os dados do perfil não sobrescrevem a anamnese salva; só preenchem o que está vazio', async () => {
  h.tables.anamnesis_responses = (f: Record<string, unknown>) => (
    f.assessment_id === ASSESSMENT ? { ...SAVED, occupation: null } : null
  );
  h.tables.profiles = (f: Record<string, unknown>) => (
    f.id === STUDENT ? { weight_kg: 99, height_cm: 150, occupation: 'Ocupação do perfil sintética' } : null
  );
  renderWizard();
  await waitFor(() => expect(screen.getByPlaceholderText(OCCUPATION)).toHaveProperty('value', 'Ocupação do perfil sintética'));
  expect(screen.getByLabelText('Peso (kg)')).toHaveProperty('value', '70.5');
  expect(screen.getByLabelText('Altura (cm)')).toHaveProperty('value', '175');
});

it('F-04: se a anamnese salva não puder ser lida, "Concluir" não grava por cima dela', async () => {
  h.tables.anamnesis_responses = () => { throw new Error('falha sintética de leitura'); };
  renderWizard();
  await screen.findByLabelText('Peso (kg)');
  fireEvent.click(screen.getByRole('button', { name: /LGPD/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Autorizo/ }));
  const submit = screen.getByRole('button', { name: /Concluir Anamnese/ });
  await waitFor(() => expect(submit).toHaveProperty('disabled', false));
  fireEvent.click(submit);

  await waitFor(() => expect(h.toasts.map((t) => t.title)).toContain('Dados salvos não carregados'));
  // Nada além do rascunho (que é outra tabela) é gravado
  expect(h.writes.filter((w) => w.table !== 'assessment_drafts')).toHaveLength(0);
});
