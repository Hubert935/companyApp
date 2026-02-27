import { ALL_MOCK_DATA, MOCK_OWNER_ID } from './data'

type FilterOp = 'eq' | 'neq' | 'in'

interface Filter {
  col: string
  val: unknown
  op: FilterOp
}

type MockRow = Record<string, unknown>

type QueryResult = {
  data: MockRow | MockRow[] | null
  error: null
  count: number | null
}

// ─── Chainable query builder ──────────────────────────────────────────────────
class MockQueryBuilder {
  private _table: string
  private _filters: Filter[] = []
  private _isSingle = false
  private _limitN?: number
  private _op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private _mutationData?: unknown
  private _count: boolean = false

  constructor(table: string) {
    this._table = table
  }

  select(_cols?: string, opts?: { count?: string }) {
    if (opts?.count) this._count = true
    return this
  }

  eq(col: string, val: unknown) {
    this._filters.push({ col, val, op: 'eq' })
    return this
  }

  neq(col: string, val: unknown) {
    this._filters.push({ col, val, op: 'neq' })
    return this
  }

  in(col: string, vals: unknown[]) {
    if (vals && vals.length > 0) {
      this._filters.push({ col, val: vals, op: 'in' })
    }
    return this
  }

  order(_col?: string, _opts?: Record<string, unknown>) { return this }
  limit(n: number) { this._limitN = n; return this }

  single() {
    this._isSingle = true
    return this
  }

  insert(data: unknown) {
    this._op = 'insert'
    this._mutationData = data
    return this
  }

  update(data: unknown) {
    this._op = 'update'
    this._mutationData = data
    return this
  }

  delete() {
    this._op = 'delete'
    return this
  }

  upsert(data: unknown, _opts?: Record<string, unknown>) {
    this._op = 'upsert'
    this._mutationData = data
    return this
  }

  // Makes the builder awaitable — satisfies the PromiseLike<QueryResult> contract
  then<T>(
    resolve: (val: QueryResult) => T | PromiseLike<T>,
    reject?: (err: unknown) => T | PromiseLike<T>
  ): Promise<T> {
    try {
      return Promise.resolve(this._resolve()).then(resolve, reject)
    } catch (e) {
      return Promise.reject(e).then(undefined, reject)
    }
  }

  private _resolve(): QueryResult {
    if (this._op !== 'select') {
      // For inserts/upserts, return the new row(s) with a generated ID
      if ((this._op === 'insert' || this._op === 'upsert') && this._mutationData) {
        const stamp = Date.now()
        const row = Array.isArray(this._mutationData)
          ? (this._mutationData as MockRow[]).map((d, i) => ({ id: `mock-${stamp}-${i}`, ...d }))
          : { id: `mock-${stamp}`, ...(this._mutationData as MockRow) }
        return { data: this._isSingle && !Array.isArray(row) ? row : row, error: null, count: null }
      }
      return { data: null, error: null, count: null }
    }

    let rows = [...((ALL_MOCK_DATA[this._table as keyof typeof ALL_MOCK_DATA] ?? []) as MockRow[])]

    for (const f of this._filters) {
      if (f.op === 'eq')  rows = rows.filter((r) => r[f.col] === f.val)
      if (f.op === 'neq') rows = rows.filter((r) => r[f.col] !== f.val)
      if (f.op === 'in')  rows = rows.filter((r) => (f.val as unknown[]).includes(r[f.col]))
    }

    if (this._limitN !== undefined) rows = rows.slice(0, this._limitN)

    const count = rows.length

    if (this._isSingle) {
      return { data: rows[0] ?? null, error: null, count }
    }

    return { data: rows, error: null, count }
  }
}

// ─── Mock auth ────────────────────────────────────────────────────────────────
const mockAuth = {
  getUser: async () => ({
    data: {
      user: {
        id: MOCK_OWNER_ID,
        email: 'owner@demo.com',
        created_at: '2024-01-01T00:00:00Z',
      },
    },
    error: null,
  }),
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({ data: {}, error: null }),
  signUp: async (_opts: Record<string, unknown>) => ({
    data: { user: { id: MOCK_OWNER_ID, email: 'owner@demo.com' }, session: null },
    error: null,
  }),
  signInWithOtp: async () => ({ data: {}, error: null }),
  exchangeCodeForSession: async () => ({ data: {}, error: null }),
}

// ─── Mock client factory ──────────────────────────────────────────────────────
export function createMockClient() {
  return {
    auth: mockAuth,
    from: (table: string) => new MockQueryBuilder(table),
  }
}
