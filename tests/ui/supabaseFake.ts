// Supabase fake for the UI tests: every query on a table resolves to tables[table].
// Awaiting the chain directly (lists) gives [] by default; maybeSingle/single give null.
// Read-only unless `writes` is given: then insert/update/upsert/delete are recorded there and succeed;
// without it they throw, so a page test that should only read fails loudly if it writes.
export type RecordedWrite = { table: string; op: 'insert' | 'update' | 'upsert' | 'delete'; payload?: unknown };

export function createSupabaseFake(tables: Record<string, unknown>, writes?: RecordedWrite[]) {
  const chain = (list: Promise<unknown>, single: () => Promise<unknown>) => {
    const query = {
      select: () => query,
      eq: () => query,
      in: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: single,
      single,
      then: list.then.bind(list),
    };
    return query;
  };
  const from = (table: string) => {
    const has = Object.prototype.hasOwnProperty.call(tables, table);
    const read = chain(
      Promise.resolve({ data: has ? tables[table] : [], error: null }),
      () => Promise.resolve({ data: has ? tables[table] : null, error: null }),
    );
    const write = (op: RecordedWrite['op']) => (payload?: unknown) => {
      if (!writes) throw new Error(`escrita inesperada: ${op} em ${table}`);
      writes.push({ table, op, payload });
      const ok = Promise.resolve({ data: null, error: null });
      return chain(ok, () => ok);
    };
    return {
      ...read,
      select: () => read,
      insert: write('insert'),
      update: write('update'),
      upsert: write('upsert'),
      delete: write('delete'),
    };
  };
  return { from };
}
