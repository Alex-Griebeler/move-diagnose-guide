// Supabase fake for the UI tests: every query on a table resolves to tables[table].
// Awaiting the chain directly (lists) gives [] by default; maybeSingle/single give null.
// A table can also be a function of the `eq` filters, to answer per assessment or to hold the answer back
// (it may return a promise). If it throws, the query answers `{ data: null, error }`, as supabase-js does.
// Read-only unless `writes` is given: then insert/update/upsert/delete are recorded there, with their options
// and `eq` filters, and succeed; without it they throw, so a page test that should only read fails loudly if it writes.
export type RecordedWrite = {
  table: string;
  op: 'insert' | 'update' | 'upsert' | 'delete';
  payload?: unknown;
  options?: unknown;
  filters: Record<string, unknown>;
};

export type TableFilters = Record<string, unknown>;

export function createSupabaseFake(tables: Record<string, unknown>, writes?: RecordedWrite[]) {
  const chain = (filters: TableFilters, list: () => Promise<unknown>, single: () => Promise<unknown>) => {
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => { filters[column] = value; return query; },
      in: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: single,
      single,
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => list().then(resolve, reject),
    };
    return query;
  };
  const answer = async (table: string, filters: TableFilters, fallback: unknown) => {
    if (!Object.prototype.hasOwnProperty.call(tables, table)) return { data: fallback, error: null };
    const source = tables[table];
    try {
      const data = typeof source === 'function' ? await source(filters) : source;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };
  const from = (table: string) => {
    const read = () => {
      const filters: TableFilters = {};
      return chain(filters, () => answer(table, filters, []), () => answer(table, filters, null));
    };
    const write = (op: RecordedWrite['op']) => (payload?: unknown, options?: unknown) => {
      if (!writes) throw new Error(`escrita inesperada: ${op} em ${table}`);
      const entry: RecordedWrite = { table, op, payload, options, filters: {} };
      writes.push(entry);
      const ok = () => Promise.resolve({ data: null, error: null });
      return chain(entry.filters, ok, ok);
    };
    return {
      ...read(),
      select: () => read(),
      insert: write('insert'),
      update: write('update'),
      upsert: write('upsert'),
      delete: write('delete'),
    };
  };
  return { from };
}
