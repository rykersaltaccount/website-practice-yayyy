export const maxDuration = 120

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    const rawBody = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const { endpoint, headers = {}, body } = rawBody || {}
    if (!endpoint || typeof endpoint !== 'string' || !/^https?:\/\//i.test(endpoint)) {
      response.statusCode = 400
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ error: 'A valid HTTP AI endpoint is required.' }))
      return
    }

    const signal = AbortSignal.timeout(30000)
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body || {}),
      signal,
    })
    const text = await upstream.text()
    response.statusCode = upstream.status
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    response.end(text)
  } catch (error) {
    const message = error?.name === 'TimeoutError' ? 'AI provider request timed out after 30 seconds.' : error instanceof Error ? error.message : 'Unable to reach AI provider.'
    response.statusCode = 502
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: message }))
  }
}