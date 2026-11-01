import { expect, it } from 'vitest';
import { checks, checkKey, readFixture } from './harness';
import { runBloco1 } from './scenarios/bloco1';

// Cenário único e sequencial: o estado se encadeia entre as seções.
// Referência: codex-review/bloco1-banco-acesso/replay/bloco1.out (RESULT pass=193 fail=0, 193 linhas PASS).
it('bloco1: replay igual à saída de referência', async () => {
  await runBloco1();
  const { pass, fail, manualFails, failures, lines } = checks();
  const got = lines.map(checkKey).filter(k => k !== null);
  expect(failures, 'checagens que falharam').toStrictEqual([]);
  expect(fail).toBe(0);
  expect(manualFails, 'checagens manuais que falharam').toBe(0);
  expect(got.filter(k => k.status === 'FAIL').map(k => k.key)).toStrictEqual([]);
  expect(pass).toBe(193);
  expect(got.map(k => k.key)).toStrictEqual(readFixture('bloco1'));
  expect(got.length).toBe(193);
});
