const UTMIFY_BASE = 'https://api.utmify.com.br/api-credentials'

export async function utmifyRequest<T>(
  path: string,
  apiKey: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${UTMIFY_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-api-token': apiKey },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`UTMify API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function getOverview(
  apiKey: string,
  startDate: string,
  endDate: string
) {
  return utmifyRequest('/dashboard/overview', apiKey, {
    start_date: startDate,
    end_date: endDate,
  })
}

export async function getCampaigns(
  apiKey: string,
  startDate: string,
  endDate: string
) {
  return utmifyRequest('/ads/campaigns', apiKey, {
    start_date: startDate,
    end_date: endDate,
  })
}

export async function getAdsets(
  apiKey: string,
  startDate: string,
  endDate: string
) {
  return utmifyRequest('/ads/adsets', apiKey, {
    start_date: startDate,
    end_date: endDate,
  })
}

export async function getAds(
  apiKey: string,
  startDate: string,
  endDate: string
) {
  return utmifyRequest('/ads/ads', apiKey, {
    start_date: startDate,
    end_date: endDate,
  })
}

export function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getNDaysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
