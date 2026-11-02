import fs from 'node:fs';
import { expect, it } from 'vitest';
import { makeDb, snapshot, ROLLBACK, CHANGES_BLOCO1_RULES } from './harness';

// Portado de codex-review/bloco1-banco-acesso/replay/rollback.mjs: o estado depois de up+down
// tem de ser idêntico ao estado sem a migration do bloco 1 (policies, funções e triggers).
// Sem as migrations que mudam regras do bloco 1 (CHANGES_BLOCO1_RULES): a 3d tem rollback e teste próprios.
// Referência (rollback.out): 66 itens antes, 94 depois do up (18 removidos, 46 adicionados), 66 depois do down.
it('rollback do bloco 1 volta ao estado anterior', async () => {
  const base = await makeDb({ withNew: false, skip: CHANGES_BLOCO1_RULES });
  const before = await snapshot(base.db);
  const up = await makeDb({ withNew: true, skip: CHANGES_BLOCO1_RULES });
  const afterUp = await snapshot(up.db);
  await up.db.exec(fs.readFileSync(ROLLBACK, 'utf8'));
  const afterDown = await snapshot(up.db);
  const diff = (a: string[], b: string[]) => a.filter(x => !b.includes(x));
  expect([before.length, afterUp.length, afterDown.length]).toStrictEqual([66, 94, 66]);
  expect([diff(before, afterUp).length, diff(afterUp, before).length]).toStrictEqual([18, 46]);
  expect(diff(before, afterDown), 'FALTA').toStrictEqual([]);
  expect(diff(afterDown, before), 'SOBRA').toStrictEqual([]);
});
