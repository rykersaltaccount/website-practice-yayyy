export const maxDuration = 30

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    const rawBody = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const query = typeof rawBody?.query === 'string' ? rawBody.query.trim() : ''
    const apiKey = process.env.TAVILY_API_KEY?.trim()
    if (!apiKey) throw new Error('Web search is not configured. Set TAVILY_API_KEY in Vercel environment variables.')
    if (!query) {
      response.statusCode = 400
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ error: 'A search query is required.' }))
      return
    }
    const upstream = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: 'basic', max_results: 5, include_answer: false }),
      signal: AbortSignal.timeout(15000),
    })
    response.statusCode = upstream.status
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    response.end(await upstream.text())
  } catch (error) {
    response.statusCode = 502
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to search the web.' }))
  }
}