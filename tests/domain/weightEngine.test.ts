import { describe, expect, it } from 'vitest';
import { compensacaoCausas, contextosAjuste, identificarContextos } from '@/data/weightEngine';

const todasCausas = Object.values(compensacaoCausas).flat();

describe('weightEngine: tabela A', () => {
  it('todo baseWeight é inteiro de 1 a 4', () => {
    for (const causa of todasCausas) {
      expect(Number.isInteger(causa.baseWeight), causa.id).toBe(true);
      expect(causa.baseWeight, causa.id).toBeGreaterThanOrEqual(1);
      expect(causa.baseWeight, causa.id).toBeLessThanOrEqual(4);
    }
  });

  // B-13: ProtocolGenerator grava baseWeight em functional_findings.biomechanical_importance,
  // e o banco aceita só 0–3. Estas causas, com peso 4, quebram esse insert até a Etapa 3.
  it('causas com baseWeight 4 (B-13)', () => {
    const peso4 = [...new Set(todasCausas.filter(c => c.baseWeight === 4).map(c => c.id))].sort();
    expect(peso4).toStrictEqual([
      'core_deep_hypo',
      'dorsiflexion_limit',
      'glute_med_hypo',
      'serratus_hypo',
      'tc_joint_restriction',
      'tib_post_hypo',
    ]);
  });

  it('nenhuma compensação repete a mesma causa', () => {
    for (const [comp, causas] of Object.entries(compensacaoCausas)) {
      const ids = causas.map(c => c.id);
      expect(new Set(ids).size, comp).toBe(ids.length);
    }
  });
});

describe('weightEngine: tabela E', () => {
  // Hoje estes ajustes nunca se aplicam: nenhuma compensação gera essas causas.
  it('ajustes de contexto sem causa correspondente (conhecidos)', () => {
    const ids = new Set(todasCausas.map(c => c.id));
    const orfaos = contextosAjuste.flatMap(c =>
      Object.keys(c.ajustes).filter(id => !ids.has(id)).map(id => `${c.condicao}:${id}`));
    expect(orfaos.sort()).toStrictEqual(['corrida:calf_tight', 'dor_joelho:vmo_hypo', 'futebol:adductor_hyper']);
  });
});

describe('identificarContextos', () => {
  it('anamnese vazia não gera contexto', () => {
    expect(identificarContextos({})).toStrictEqual([]);
  });

  it('dor, esporte, sedentarismo e sono, sem repetir', () => {
    expect(identificarContextos({
      painHistory: [
        { region: 'Lombar', intensity: 5 },
        { region: 'coluna torácica', intensity: 3 },
        { region: 'Joelho direito', intensity: 2 },
      ],
      sports: [{ name: 'Corrida de rua' }],
      activityTypes: ['Musculação'],
      sedentaryHoursPerDay: 8,
      sleepQuality: 2,
    })).toStrictEqual(['dor_lombar', 'dor_joelho', 'corrida', 'musculacao', 'sedentarismo', 'sono_ruim']);
  });

  it('ombro, cervical, futebol, saltos e natação', () => {
    expect(identificarContextos({
      painHistory: [{ region: 'ombro', intensity: 1 }, { region: 'pescoço', intensity: 1 }],
      sports: [{ name: 'Futebol' }, { name: 'Vôlei' }, { name: 'Natação' }],
    })).toStrictEqual(['dor_ombro', 'dor_cervical', 'futebol', 'saltos', 'natacao']);
  });

  it('limites: 5 h sentado e sono 3 não geram contexto', () => {
    expect(identificarContextos({ sedentaryHoursPerDay: 5, sleepQuality: 3 })).toStrictEqual([]);
    expect(identificarContextos({ sedentaryHoursPerDay: 6, sleepQuality: 1 })).toStrictEqual(['sedentarismo', 'sono_ruim']);
  });
});
