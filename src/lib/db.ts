// Neon (postgres) bilan ishlovchi DB qatlami.
// Supabase-ning `@supabase/supabase-js` API’sining biz ishlatgan qismi uchun shim.
// Maqsad: ilovaning qolgan kodi (lib + routes) o‘zgartirilmasdan ishlasin.

import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;
export function sql(): ReturnType<typeof postgres> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL env yo‘q");
    _sql = postgres(url, {
      ssl: "require",
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}

export type DbResult<T> = { data: T | null; error: { message: string } | null; count?: number };

const ident = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

function asJsonb(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "object" && !(v instanceof Date)) return JSON.stringify(v);
  return v;
}

type Mode = "list" | "single" | "maybeSingle" | "none" | "count";
type Op = "select" | "insert" | "update" | "delete" | "upsert";

class QBBase {
  protected op: Op = "select";
  protected cols = "*";
  protected filters: Array<{ col: string; op: string; val: unknown }> = [];
  protected orderBy: Array<{ col: string; asc: boolean }> = [];
  protected limitN: number | null = null;
  protected payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  protected patch: Record<string, unknown> | null = null;
  protected onConflict: string | null = null;
  protected returning: string | null = null;
  protected mode: Mode = "list";
  protected headOnly = false;

  constructor(protected table: string) {}

  protected buildWhere(values: unknown[]): string {
    if (this.filters.length === 0) return "";
    const parts: string[] = [];
    for (const f of this.filters) {
      if (f.op === "is") {
        if (f.val === null) parts.push(`${ident(f.col)} is null`);
        else parts.push(`${ident(f.col)} is not null`);
      } else if (f.op === "is_not") {
        if (f.val === null) parts.push(`${ident(f.col)} is not null`);
        else parts.push(`${ident(f.col)} is null`);
      } else if (f.op === "in") {
        const arr = f.val as unknown[];
        if (arr.length === 0) {
          parts.push(`false`);
        } else {
          const ph: string[] = [];
          for (const v of arr) {
            values.push(v);
            ph.push(`$${values.length}`);
          }
          parts.push(`${ident(f.col)} in (${ph.join(",")})`);
        }
      } else {
        values.push(f.val);
        parts.push(`${ident(f.col)} ${f.op} $${values.length}`);
      }
    }
    return ` where ${parts.join(" and ")}`;
  }

  protected async run<TRow>(): Promise<DbResult<TRow | TRow[]>> {
    try {
      const s = sql();
      const values: unknown[] = [];
      const t = ident(this.table);

      if (this.op === "select") {
        if (this.mode === "count" && this.headOnly) {
          const where = this.buildWhere(values);
          const res = (await s.unsafe(
            `select count(*)::int as c from ${t}${where}`,
            values as never[]
          )) as unknown as Array<{ c: number }>;
          return { data: null as unknown as TRow[], error: null, count: res[0]?.c ?? 0 };
        }
        const where = this.buildWhere(values);
        const order =
          this.orderBy.length > 0
            ? ` order by ${this.orderBy
                .map((o) => `${ident(o.col)} ${o.asc ? "asc" : "desc"}`)
                .join(", ")}`
            : "";
        const lim = this.limitN ? ` limit ${Math.max(0, Math.floor(this.limitN))}` : "";
        const q = `select ${this.cols} from ${t}${where}${order}${lim}`;
        const rows = (await s.unsafe(q, values as never[])) as unknown as TRow[];
        return this.shape<TRow>(rows);
      }

      if (this.op === "insert" || this.op === "upsert") {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
        if (rows.length === 0) return { data: [] as TRow[], error: null };
        const cols = Object.keys(rows[0]);
        const valsPlaceholders: string[] = [];
        for (const r of rows) {
          const ph: string[] = [];
          for (const c of cols) {
            values.push(asJsonb((r as Record<string, unknown>)[c]));
            ph.push(`$${values.length}`);
          }
          valsPlaceholders.push(`(${ph.join(",")})`);
        }
        let q = `insert into ${t} (${cols.map(ident).join(",")}) values ${valsPlaceholders.join(",")}`;
        if (this.op === "upsert") {
          if (this.onConflict) {
            const conflictCols = this.onConflict
              .split(",")
              .map((c) => ident(c.trim()))
              .join(",");
            const conflictColNames = this.onConflict.split(",").map((x) => x.trim());
            const updateCols = cols
              .filter((c) => !conflictColNames.includes(c))
              .map((c) => `${ident(c)} = excluded.${ident(c)}`)
              .join(", ");
            q += ` on conflict (${conflictCols}) do update set ${
              updateCols || `${ident(cols[0])} = excluded.${ident(cols[0])}`
            }`;
          } else {
            q += ` on conflict do nothing`;
          }
        }
        if (this.returning || this.mode !== "none") {
          q += ` returning ${this.returning ?? "*"}`;
        }
        const out = (await s.unsafe(q, values as never[])) as unknown as TRow[];
        return this.shape<TRow>(out);
      }

      if (this.op === "update") {
        const cols = Object.keys(this.patch ?? {});
        const sets = cols.map((c) => {
          values.push(asJsonb((this.patch as Record<string, unknown>)[c]));
          return `${ident(c)} = $${values.length}`;
        });
        const where = this.buildWhere(values);
        let q = `update ${t} set ${sets.join(", ")}${where}`;
        if (this.returning || (this.mode !== "none" && this.mode !== "count")) {
          q += ` returning ${this.returning ?? "*"}`;
        }
        const out = (await s.unsafe(q, values as never[])) as unknown as TRow[];
        return this.shape<TRow>(out);
      }

      if (this.op === "delete") {
        const where = this.buildWhere(values);
        let q = `delete from ${t}${where}`;
        if (this.returning) q += ` returning ${this.returning}`;
        const out = (await s.unsafe(q, values as never[])) as unknown as TRow[];
        return this.shape<TRow>(out);
      }

      return { data: null, error: { message: "unknown op" } };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  private shape<TRow>(rows: TRow[]): DbResult<TRow | TRow[]> {
    if (this.mode === "single") {
      if (rows.length === 0) return { data: null, error: { message: "no rows" } };
      return { data: rows[0], error: null };
    }
    if (this.mode === "maybeSingle") {
      if (rows.length === 0) return { data: null, error: null };
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }
}

class QBSingle<T> extends QBBase implements PromiseLike<DbResult<T>> {
  constructor(parent: QBBase) {
    super((parent as unknown as { table: string }).table);
    Object.assign(this, parent);
  }
  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((v: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((e: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return (this.run<T>() as Promise<DbResult<T>>).then(onfulfilled as never, onrejected as never);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class QB<T = any> extends QBBase implements PromiseLike<DbResult<T[]>> {
  // ---- Selection / write builders ----
  select(cols = "*", opts?: { count?: "exact"; head?: boolean }) {
    if (this.op === "insert" || this.op === "upsert" || this.op === "update") {
      this.returning = cols;
    } else {
      this.op = "select";
      this.cols = cols;
    }
    if (opts?.count) this.mode = "count";
    if (opts?.head) this.headOnly = true;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.payload = payload;
    this.mode = "none";
    return this;
  }

  upsert(
    payload: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string }
  ) {
    this.op = "upsert";
    this.payload = payload;
    this.onConflict = opts?.onConflict ?? null;
    this.mode = "none";
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.op = "update";
    this.patch = patch;
    this.mode = "none";
    return this;
  }

  delete() {
    this.op = "delete";
    this.mode = "none";
    return this;
  }

  // ---- Filters ----
  eq(col: string, val: unknown) { this.filters.push({ col, op: "=", val }); return this; }
  neq(col: string, val: unknown) { this.filters.push({ col, op: "<>", val }); return this; }
  gt(col: string, val: unknown) { this.filters.push({ col, op: ">", val }); return this; }
  gte(col: string, val: unknown) { this.filters.push({ col, op: ">=", val }); return this; }
  lt(col: string, val: unknown) { this.filters.push({ col, op: "<", val }); return this; }
  lte(col: string, val: unknown) { this.filters.push({ col, op: "<=", val }); return this; }
  is(col: string, val: unknown) { this.filters.push({ col, op: "is", val }); return this; }
  // Supabase API: .not('col', 'is', null) → "col is not null". Bizda faqat shu shaklda kerak.
  not(col: string, op: string, val: unknown) {
    if (op === "is") this.filters.push({ col, op: "is_not", val });
    else this.filters.push({ col, op: `not_${op}`, val });
    return this;
  }
  in(col: string, vals: unknown[]) { this.filters.push({ col, op: "in", val: vals }); return this; }

  // ---- Modifiers ----
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }

  // ---- Termination (type-changing) ----
  single(): QBSingle<T> {
    this.mode = "single";
    return new QBSingle<T>(this);
  }
  maybeSingle(): QBSingle<T | null> {
    this.mode = "maybeSingle";
    return new QBSingle<T | null>(this);
  }

  // ---- PromiseLike (default = list) ----
  then<R1 = DbResult<T[]>, R2 = never>(
    onfulfilled?: ((v: DbResult<T[]>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((e: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return (this.run<T>() as Promise<DbResult<T[]>>).then(
      onfulfilled as never,
      onrejected as never
    );
  }
}

class DbClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from<T = any>(table: string): QB<T> {
    return new QB<T>(table);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async rpc<T = any>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<DbResult<T>> {
    try {
      const s = sql();
      const keys = Object.keys(args);
      const values = keys.map((k) => asJsonb(args[k]));
      const argList = keys.map((k, i) => `${ident(k)} := $${i + 1}`).join(", ");
      const q = `select * from ${ident(name)}(${argList})`;
      const rows = (await s.unsafe(q, values as never[])) as unknown as Record<string, unknown>[];
      // Skalar funksiya — bitta qator, bitta ustun
      if (rows.length === 1) {
        const cols = Object.keys(rows[0]);
        if (cols.length === 1) {
          const v = rows[0][cols[0]];
          return { data: (v ?? null) as T, error: null };
        }
      }
      return { data: rows as unknown as T, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }
}

const _client = new DbClient();

export function db(): DbClient {
  return _client;
}
