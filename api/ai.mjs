export const maxDuration = 120;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const rawBody = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const { endpoint, headers = {}, body } = rawBody || {};
    if (!endpoint || typeof endpoint !== 'string' || !/^https?:\/\//i.test(endpoint)) {
      response.status(400).json({ error: 'A valid HTTP AI endpoint is required.' });
      return;
    }

    const signal = AbortSignal.timeout(120000);
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body || {}),
      signal,
    });
    const text = await upstream.text();
    response.status(upstream.status);
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    response.send(text);
  } catch (error) {
    const message = error?.name === 'TimeoutError' ? 'AI provider request timed out.' : error instanceof Error ? error.message : 'Unable to reach AI provider.';
    response.status(502).json({ error: message });
  }
}
