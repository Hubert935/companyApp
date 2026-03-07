const GUSTO_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api.gusto.com'
    : 'https://api.gusto-demo.com'

const GUSTO_AUTH_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api.gusto.com'
    : 'https://api.gusto-demo.com'

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GUSTO_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gusto/callback`,
    response_type: 'code',
    state,
  })
  return `${GUSTO_AUTH_BASE}/oauth/authorize?${params}`
}

export interface GustoTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export async function exchangeCode(code: string): Promise<GustoTokenResponse> {
  const res = await fetch(`${GUSTO_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.GUSTO_CLIENT_ID!,
      client_secret: process.env.GUSTO_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gusto/callback`,
    }),
  })
  if (!res.ok) throw new Error(`Gusto token exchange failed: ${res.status}`)
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<GustoTokenResponse> {
  const res = await fetch(`${GUSTO_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.GUSTO_CLIENT_ID!,
      client_secret: process.env.GUSTO_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error(`Gusto token refresh failed: ${res.status}`)
  return res.json()
}

export interface GustoEmployee {
  uuid: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  terminated: boolean
}

export async function fetchGustoCompanies(accessToken: string): Promise<{ uuid: string; name: string }[]> {
  const res = await fetch(`${GUSTO_BASE}/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Gusto /me failed: ${res.status}`)
  const data = await res.json()
  // The /v1/me endpoint returns the current user's companies
  return (data.roles?.payroll_admin?.companies ?? []).map((c: { uuid: string; name: string }) => ({
    uuid: c.uuid,
    name: c.name,
  }))
}

export async function fetchGustoEmployees(
  accessToken: string,
  companyUuid: string
): Promise<GustoEmployee[]> {
  const res = await fetch(`${GUSTO_BASE}/v1/companies/${companyUuid}/employees?include=all_compensations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Gusto-API-Version': '2024-03-01',
    },
  })
  if (!res.ok) throw new Error(`Gusto employees fetch failed: ${res.status}`)
  const employees = await res.json()
  return (employees as Array<{
    uuid: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    terminated: boolean
  }>).map((e) => ({
    uuid: e.uuid,
    first_name: e.first_name,
    last_name: e.last_name,
    email: e.email ?? null,
    phone: e.phone ?? null,
    terminated: e.terminated,
  }))
}
