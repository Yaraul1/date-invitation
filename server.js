const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8080);
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-this-key';
const ROOT = __dirname;
const HTML_FILE = path.join(ROOT, 'index.html');
const DATA_FILE = path.join(ROOT, 'responses.json');

function readResponses() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeResponses(responses) {
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(responses, null, 2));
  fs.renameSync(temporaryFile, DATA_FILE);
}

function isAuthorized(requestUrl) {
  const suppliedKey = new URL(requestUrl, `http://localhost:${PORT}`).searchParams.get('key') || '';
  const suppliedBytes = Buffer.from(suppliedKey);
  const expectedBytes = Buffer.from(ADMIN_KEY);
  return suppliedBytes.length === expectedBytes.length && crypto.timingSafeEqual(suppliedBytes, expectedBytes);
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  response.end(body);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        request.destroy();
        reject(new Error('request too large'));
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://localhost:${PORT}`);

  if (request.method === 'GET' && requestUrl.pathname === '/api/responses') {
    if (!isAuthorized(request.url)) return sendJson(response, 401, { error: 'unauthorized' });
    return sendJson(response, 200, readResponses());
  }

  if (request.method === 'DELETE' && requestUrl.pathname === '/api/responses') {
    if (!isAuthorized(request.url)) return sendJson(response, 401, { error: 'unauthorized' });
    writeResponses([]);
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/responses') {
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const responseItem = {
        id: typeof payload.id === 'string' ? payload.id.slice(0, 120) : `date-${Date.now()}`,
        answer: 'Да',
        formats: Array.isArray(payload.formats)
          ? payload.formats.filter((item) => typeof item === 'string').slice(0, 6).map((item) => item.slice(0, 120))
          : [],
        format: typeof payload.format === 'string' ? payload.format.slice(0, 120) : '',
        formatIcon: typeof payload.formatIcon === 'string' ? payload.formatIcon.slice(0, 8) : '✨',
        detail: typeof payload.detail === 'string' ? payload.detail.slice(0, 240) : '',
        when: typeof payload.when === 'string' ? payload.when.slice(0, 500) : '',
        note: typeof payload.note === 'string' ? payload.note.slice(0, 1000) : '',
        createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : new Date().toISOString()
      };
      const responses = readResponses();
      responses.push(responseItem);
      writeResponses(responses);
      return sendJson(response, 201, { ok: true });
    } catch {
      return sendJson(response, 400, { error: 'invalid request' });
    }
  }

  if (request.method === 'GET' && (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html')) {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(HTML_FILE).pipe(response);
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);
  console.log(`Админка: http://localhost:${PORT}/?admin=${ADMIN_KEY}`);
  console.log('Для публичной ссылки разместите этот проект на Node-хостинге и задайте ADMIN_KEY.');
});
