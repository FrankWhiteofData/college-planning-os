/* ============================================================
   College Planning OS — server
   - Serves the front-end from /public
   - Proxies College Scorecard through /api/colleges/* so the API key
     (COLLEGE_SCORECARD_API_KEY) stays server-side and is never exposed
     to the browser.
   Zero external dependencies — uses only Node's built-in modules.
   Requires Node 18+ (for global fetch).
============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

loadEnv(); // read .env into process.env (no dependency needed)
const scorecard = require('./services/collegeScorecard');

const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.map':'application/json' };

function loadEnv() {
  try {
    const p = path.join(__dirname, '.env');
    if (!fs.existsSync(p)) return;
    fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch (e) { /* ignore */ }
}

function sendJSON(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

const server = http.createServer(async (req, res) => {
  const u = url.parse(req.url, true);
  const p = u.pathname;
  try {
    // ---- API ----
    if (p === '/api/status') return sendJSON(res, 200, { scorecard: scorecard.status(), ipeds: { status: 'NOT_IMPORTED' } });

    if (p === '/api/colleges/search') {
      try { const results = await scorecard.searchColleges(u.query); return sendJSON(res, 200, { source: 'scorecard', results }); }
      catch (e) { return sendJSON(res, e.code === 'NOT_CONFIGURED' ? 400 : e.code === 'RATE_LIMITED' ? 429 : 502, { error: e.message }); }
    }
    if (p === '/api/colleges/test') {
      try { await scorecard.test(); return sendJSON(res, 200, { ok: true }); }
      catch (e) { return sendJSON(res, 200, { ok: false, error: e.message }); }
    }
    const m = p.match(/^\/api\/colleges\/([^\/]+)(\/programs)?$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      try {
        if (m[2]) { const programs = await scorecard.getCollegePrograms(id); return sendJSON(res, 200, { programs }); }
        const rec = await scorecard.getCollegeById(id);
        if (!rec) return sendJSON(res, 404, { error: 'NOT_FOUND' });
        return sendJSON(res, 200, rec);
      } catch (e) { return sendJSON(res, e.code === 'NOT_CONFIGURED' ? 400 : 502, { error: e.message }); }
    }
    if (p.startsWith('/api/')) return sendJSON(res, 404, { error: 'NOT_FOUND' });

    // ---- Static front-end ----
    let rel = (p === '/' ? 'index.html' : p.replace(/^\/+/, ''));
    let fp = path.join(PUBLIC, rel);
    if (!fp.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(fp, (e1, buf) => {
      if (e1) { // fall back to index.html (single-page app)
        fs.readFile(path.join(PUBLIC, 'index.html'), (e2, idx) => {
          if (e2) { res.writeHead(404); res.end('Not found'); }
          else { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(idx); }
        });
      } else { res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(buf); }
    });
  } catch (e) { sendJSON(res, 500, { error: 'SERVER_ERROR' }); }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const configured = !!(process.env.COLLEGE_SCORECARD_API_KEY || '').trim();
  console.log('College Planning OS  →  http://localhost:' + PORT);
  console.log('College Scorecard API key: ' + (configured ? 'configured ✓' : 'MISSING (set COLLEGE_SCORECARD_API_KEY in .env)'));
});
