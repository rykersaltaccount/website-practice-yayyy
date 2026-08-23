import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const port = 8787;
const maxBodySize = 512 * 1024;
const timeoutMs = 5000;

const sendJson = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const runProcess = (command, args, options = {}) => new Promise(resolve => {
  const child = spawn(command, args, { windowsHide: true, ...options });
  let stdout = '';
  let stderr = '';
  let finished = false;
  const timer = setTimeout(() => {
    if (!finished) child.kill();
  }, timeoutMs);

  child.stdout?.on('data', chunk => { stdout += chunk; });
  child.stderr?.on('data', chunk => { stderr += chunk; });
  child.on('error', error => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    resolve({ code: -1, stdout, stderr: error.message });
  });
  child.on('close', code => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    resolve({ code: code ?? -1, stdout, stderr });
  });
});

const readRequestBody = request => new Promise((resolve, reject) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => {
    body += chunk;
    if (body.length > maxBodySize) reject(new Error('Request body is too large.'));
  });
  request.on('end', () => resolve(body));
  request.on('error', reject);
});

const proxyNvidiaRequest = async (request, response) => {
  const body = await readRequestBody(request);
  const targetUrl = `https://integrate.api.nvidia.com${request.url.slice('/api/nvidia'.length)}`;
  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: {
      'Content-Type': request.headers['content-type'] || 'application/json',
      ...(request.headers.authorization ? { Authorization: request.headers.authorization } : {}),
    },
    body,
  });
  response.writeHead(upstream.status, {
    'Content-Type': upstream.headers.get('content-type') || 'application/json',
  });
  response.end(await upstream.text());
};

const proxyAiRequest = async (request, response) => {
  const body = JSON.parse(await readRequestBody(request));
  const method = body.method === 'GET' ? 'GET' : 'POST';
  if (!body.endpoint || !/^https?:\/\//i.test(body.endpoint)) {
    sendJson(response, 400, { error: 'A valid AI endpoint is required.' });
    return;
  }
  const upstream = await fetch(body.endpoint, {
    method,
    headers: { 'Content-Type': 'application/json', ...(body.headers || {}) },
    ...(method === 'POST' ? { body: JSON.stringify(body.body || {}) } : {}),
    signal: AbortSignal.timeout(90000),
  });
  response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' });
  response.end(await upstream.text());
};

const compileAndRun = async code => {
  const folder = await mkdtemp(join(tmpdir(), 'codevault-'));
  const sourcePath = join(folder, 'main.cpp');
  const outputPath = join(folder, process.platform === 'win32' ? 'main.exe' : 'main');

  try {
    await writeFile(sourcePath, code, 'utf8');
    const compile = await runProcess('g++', ['-std=c++23', '-O0', sourcePath, '-o', outputPath]);
    if (compile.code !== 0) {
      return { ok: false, phase: 'compile', output: compile.stderr || compile.stdout || 'Compilation failed.' };
    }

    const execution = await runProcess(outputPath);
    return {
      ok: execution.code === 0,
      phase: 'run',
      output: execution.stdout || execution.stderr || (execution.code === 0 ? 'Program finished with no output.' : `Program exited with code ${execution.code}.`),
    };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
};

const server = createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/api/ai') {
    proxyAiRequest(request, response).catch(error => {
      sendJson(response, 502, { error: `AI proxy failed: ${error instanceof Error ? error.message : String(error)}` });
    });
    return;
  }

  if (request.method === 'POST' && request.url?.startsWith('/api/nvidia/')) {
    proxyNvidiaRequest(request, response).catch(error => {
      sendJson(response, 502, { error: `NVIDIA proxy failed: ${error instanceof Error ? error.message : String(error)}` });
    });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/compile') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  readRequestBody(request).then(async body => {
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed.code !== 'string' || !parsed.code.trim()) {
        sendJson(response, 400, { error: 'C++ source code is required.' });
        return;
      }
      sendJson(response, 200, await compileAndRun(parsed.code));
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }).catch(error => sendJson(response, 413, { error: error instanceof Error ? error.message : String(error) }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`CodeVault C++ compiler listening at http://127.0.0.1:${port}`);
});