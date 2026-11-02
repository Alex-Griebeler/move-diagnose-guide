// Apoio (não é teste) para trocar a fonte dos limiares clínicos: o padrão, o override no localStorage
// ou o perfil ativo da organização no backend. O Supabase é falso e só responde às duas leituras de
// refreshClinicalThresholdsFromBackend; nada acessa a rede. Dados sintéticos.
import { vi } from 'vitest';
import type { ClinicalThresholdsConfig } from '@/lib/clinical/clinicalThresholds';

export type ThresholdSourceName = 'padrão' | 'localStorage' | 'backend';
export const THRESHOLD_SOURCES: ThresholdSourceName[] = ['padrão', 'localStorage', 'backend'];

let backendProfile: { id: string; config: Partial<ClinicalThresholdsConfig>; evidence_version: string } | null = null;

const tableData = (table: string) => {
  if (table === 'organization_members') return backendProfile ? { organization_id: 'org-sintetica' } : null;
  if (table === 'clinical_threshold_profiles') return backendProfile;
  throw new Error(`tabela inesperada: ${table}`);
};

// Exportado com o nome do módulo real, para `vi.mock('@/integrations/supabase/client', () => import(...))`
export const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: 'profissional-sintetico' } } }) },
  from: (table: string) => {
    const query = {
      select: () => query,
      eq: () => query,
      limit: () => query,
      single: async () => ({ data: tableData(table), error: null }),
    };
    return query;
  },
};

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() { return items.size; },
    clear: () => items.clear(),
    getItem: key => items.get(key) ?? null,
    key: index => [...items.keys()][index] ?? null,
    removeItem: key => { items.delete(key); },
    setItem: (key, value) => { items.set(key, String(value)); },
  };
}

/** Volta ao padrão: sem override, sem perfil e sem cache. */
export async function resetThresholdSource(): Promise<void> {
  vi.stubGlobal('localStorage', memoryStorage());
  backendProfile = null;
  // Import tardio: o módulo de limiares importa o Supabase, que os testes trocam por este arquivo
  const { resetClinicalThresholdOverrides } = await import('@/lib/clinical/clinicalThresholds');
  resetClinicalThresholdOverrides();
}

/** Liga a fonte pedida com `config` (ignorado no padrão). */
export async function useThresholdSource(
  source: ThresholdSourceName,
  config: Partial<ClinicalThresholdsConfig>,
  evidenceVersion = 'perfil-sintetico-2025',
): Promise<void> {
  await resetThresholdSource();
  const thresholds = await import('@/lib/clinical/clinicalThresholds');
  if (source === 'localStorage') thresholds.saveClinicalThresholdOverrides(config);
  if (source === 'backend') {
    backendProfile = { id: 'perfil-sintetico', config, evidence_version: evidenceVersion };
    await thresholds.refreshClinicalThresholdsFromBackend();
  }
  const expected = source === 'padrão' ? 'defaults' : source;
  if (thresholds.getThresholdSource() !== expected) throw new Error(`fonte ${source} não ficou ativa`);
}
