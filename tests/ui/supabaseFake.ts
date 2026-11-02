// Read-only Supabase fake for the page tests: every query on a table resolves to tables[table].
// Awaiting the chain directly (lists) gives [] by default; maybeSingle/single give null.
export function createSupabaseFake(tables: Record<string, unknown>) {
  const from = (table: string) => {
    const has = Object.prototype.hasOwnProperty.call(tables, table);
    const single = () => Promise.resolve({ data: has ? tables[table] : null, error: null });
    const list = Promise.resolve({ data: has ? tables[table] : [], error: null });
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
  return { from };
}
