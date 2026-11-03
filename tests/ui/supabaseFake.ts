// Supabase fake for the UI tests: every query on a table resolves to tables[table].
// Awaiting the chain directly (lists) gives [] by default; maybeSingle/single give null.
// A table can also be a function of the `eq` filters, to answer per assessment or to hold the answer back
// (it may return a promise). If it throws, the query answers `{ data: null, error }`, as supabase-js does.
// Read-only unless `writes` is given: then insert/update/upsert/delete and rpc calls are recorded there, with
// their options and `eq` filters, and succeed; without it they throw, so a page test that should only read
// fails loudly if it writes. `fail` makes a write answer `{ data: null, error: { message } }` instead, by
// "table.op" (for example "assessments.update") or "name.rpc"; the write is still recorded.
// An rpc that only reads answers from tables["rpc:name"] instead, like a table (a value, or a function of the
// arguments), and is not recorded.
export type RecordedWrite = {
  table: string;
  op: 'insert' | 'update' | 'upsert' | 'delete' | 'rpc';
  payload?: unknown;
  options?: unknown;
  filters: Record<string, unknown>;
};

export type TableFilters = Record<string, unknown>;

export function createSupabaseFake(tables: Record<string, unknown>, writes?: RecordedWrite[], fail: Record<string, string> = {}) {
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
  const record = (table: string, op: RecordedWrite['op'], payload?: unknown, options?: unknown) => {
    if (!writes) throw new Error(`escrita inesperada: ${op} em ${table}`);
    const entry: RecordedWrite = { table, op, payload, options, filters: {} };
    writes.push(entry);
    const message = fail[`${table}.${op}`];
    const result = () => Promise.resolve(message ? { data: null, error: { message } } : { data: null, error: null });
    return { entry, result };
  };
  const from = (table: string) => {
    const read = () => {
      const filters: TableFilters = {};
      return chain(filters, () => answer(table, filters, []), () => answer(table, filters, null));
    };
    const write = (op: RecordedWrite['op']) => (payload?: unknown, options?: unknown) => {
      const { entry, result } = record(table, op, payload, options);
      return chain(entry.filters, result, result);
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
  const rpc = (name: string, args?: unknown) => {
    const read = `rpc:${name}`;
    if (Object.prototype.hasOwnProperty.call(tables, read)) return answer(read, (args ?? {}) as TableFilters, null);
    return record(name, 'rpc', args).result();
  };
  return { from, rpc };
}
