import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compensacaoCausas, contextosAjuste } from '@/data/weightEngine';
import { impactModifiers, severityModifiers } from '@/lib/priorityEngine';

// B-13: o motor grava os próprios valores em functional_findings, então as faixas do banco têm de
// conter tudo o que ele pode calcular. As faixas são lidas da migration que as define; um peso ou
// contexto novo acima delas falha aqui, antes de a gravação do protocolo falhar no banco.
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATION = fs.readFileSync(`${REPO}/supabase/migrations/20261103120000_etapa3d_gravacao_protocolo.sql`, 'utf8');
const upperBound = (column: string) => {
  const m = MIGRATION.match(new RegExp(`CHECK \\(${column} >= 0 AND ${column} <= (\\d+)\\)`));
  if (!m) throw new Error(`faixa de ${column} não encontrada na migration`);
  return Number(m[1]);
};
// priority_score é NUMERIC(4,2) desde o schema inicial
const PRIORITY_SCORE_MAX = 99.99;

const baseWeights = Object.values(compensacaoCausas).flat().map(c => c.baseWeight);
// Pior caso: todos os contextos ao mesmo tempo
const contextSums = (() => {
  const sums = new Map<string, number>();
  for (const contexto of contextosAjuste) {
    for (const [causa, ajuste] of Object.entries(contexto.ajustes)) sums.set(causa, (sums.get(causa) ?? 0) + ajuste);
  }
  return [...sums.values()];
})();
const allAdjustments = contextosAjuste.flatMap(c => Object.values(c.ajustes));

describe('contrato dos achados com o banco', () => {
  it('as faixas da migration são as decididas pelo Alex (02/11/2026): peso 0..4 e contexto 0..6', () => {
    expect(upperBound('biomechanical_importance')).toBe(4);
    expect(upperBound('context_weight')).toBe(6);
  });

  it('o peso base de toda causa cabe em biomechanical_importance', () => {
    expect(Math.min(...baseWeights)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...baseWeights)).toBeLessThanOrEqual(upperBound('biomechanical_importance'));
    expect(baseWeights.every(Number.isInteger)).toBe(true);
  });

  it('a soma dos ajustes de contexto de uma causa cabe em context_weight', () => {
    expect(Math.min(...allAdjustments)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...contextSums)).toBeLessThanOrEqual(upperBound('context_weight'));
    expect(allAdjustments.every(Number.isInteger)).toBe(true);
  });

  it('o maior priority_score possível cabe em NUMERIC(4,2)', () => {
    const worst = (Math.max(...baseWeights) + Math.max(...contextSums))
      * Math.max(...Object.values(severityModifiers)) * Math.max(...Object.values(impactModifiers));
    expect(worst).toBeLessThanOrEqual(PRIORITY_SCORE_MAX);
  });
});
