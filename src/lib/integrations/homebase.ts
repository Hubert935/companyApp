const HB_BASE = 'https://api.joinhomebase.com'

export interface HomebaseShift {
  id: string
  employee_id: string
  employee_name: string
  role: string | null
  start_time: string
  end_time: string
  location_id: string
}

export interface HomebaseScheduleResponse {
  shifts: HomebaseShift[]
}

export async function fetchHomebaseSchedule(
  apiKey: string,
  locationId: string,
  from: string,
  to: string
): Promise<HomebaseScheduleResponse> {
  const params = new URLSearchParams({ from, to, location_id: locationId })
  const res = await fetch(`${HB_BASE}/v1/shifts?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Homebase API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function testHomebaseConnection(apiKey: string, locationId: string): Promise<boolean> {
  try {
    const now = new Date()
    const from = now.toISOString().split('T')[0]
    const to   = from
    await fetchHomebaseSchedule(apiKey, locationId, from, to)
    return true
  } catch {
    return false
  }
}
