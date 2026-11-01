import { expect, it } from 'vitest';
import { checks, checkKey, readFixture } from './harness';
import { runR9 } from './scenarios/r9';

// Inclui 6 checagens manuais (pré-condições), que também falham o teste.
// Referência: codex-review/bloco1-banco-acesso/replay/r9.out (RESULT pass=11 fail=0, 17 linhas PASS).
it('r9: replay igual à saída de referência', async () => {
  await runR9();
  const { pass, fail, manualFails, failures, lines } = checks();
  const got = lines.map(checkKey).filter(k => k !== null);
  expect(failures, 'checagens que falharam').toStrictEqual([]);
  expect(fail).toBe(0);
  expect(manualFails, 'checagens manuais que falharam').toBe(0);
  expect(got.filter(k => k.status === 'FAIL').map(k => k.key)).toStrictEqual([]);
  expect(pass).toBe(11);
  expect(got.map(k => k.key)).toStrictEqual(readFixture('r9'));
  expect(got.length).toBe(17);
});
