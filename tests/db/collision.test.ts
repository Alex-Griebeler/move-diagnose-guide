import { expect, it } from 'vitest';
import { checks, checkKey, readFixture } from './harness';
import { runCollision } from './scenarios/collision';

// Inclui 3 checagens manuais (preparação), que também falham o teste.
// Referência: codex-review/bloco1-banco-acesso/replay/collision.out (RESULT pass=8 fail=0, 11 linhas PASS).
it('collision: replay igual à saída de referência', async () => {
  await runCollision();
  const { pass, fail, manualFails, failures, lines } = checks();
  const got = lines.map(checkKey).filter(k => k !== null);
  expect(failures, 'checagens que falharam').toStrictEqual([]);
  expect(fail).toBe(0);
  expect(manualFails, 'checagens manuais que falharam').toBe(0);
  expect(got.filter(k => k.status === 'FAIL').map(k => k.key)).toStrictEqual([]);
  expect(pass).toBe(8);
  expect(got.map(k => k.key)).toStrictEqual(readFixture('collision'));
  expect(got.length).toBe(11);
});
