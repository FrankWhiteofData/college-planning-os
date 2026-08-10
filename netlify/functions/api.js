/* ============================================================
   Netlify Function — College Scorecard proxy for College Planning OS
   Handles all /api/* routes (via netlify.toml redirect).
   The API key is read from the Netlify environment variable
   COLLEGE_SCORECARD_API_KEY and is NEVER sent to the browser.
   Requires Node 18+ (global fetch) — Netlify's default runtime.
============================================================ */
'use strict';

const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';
const FIELDS = [
  'id','school.name','school.city','school.state','school.zip','school.school_url',
  'school.ownership','school.locale','latest.student.size',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.act_scores.25th_percentile.cumulative',
  'latest.admissions.act_scores.75th_percentile.cumulative',
  'latest.admissions.sat_scores.average.overall',
  'latest.cost.attendance.academic_year','latest.cost.tuition.in_state','latest.cost.tuition.out_of_state','latest.cost.avg_net_price.overall',
  'latest.completion.completion_rate_4yr_150nt','latest.student.retention_rate.four_year.full_time'
].join(',');
const LOCALE = { 11:'city',12:'city',13:'city',21:'suburban',22:'suburban',23:'suburban',31:'town',32:'town',33:'town',41:'town',42:'town',43:'town' };

function apiKey() { return (process.env.COLLEGE_SCORECARD_API_KEY || '').trim(); }
function n(v) { return (v === null || v === undefined) ? null : v; }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

function normalize(r) {
  const own = r['school.ownership']; const size = r['latest.student.size'];
  const ar = r['latest.admissions.admission_rate.overall'];
  const grad = r['latest.completion.completion_rate_4yr_150nt'];
  const ret = r['latest.student.retention_rate.four_year.full_time'];
  return {
    id: r['id'], unitid: r['id'], name: r['school.name'], city: r['school.city'], state: r['school.state'], zip: r['school.zip'] || null,
    website: r['school.school_url'] || null,
    control: own === 1 ? 'public' : (own === 2 || own === 3) ? 'private' : '',
    setting: LOCALE[r['school.locale']] || '',
    size: size == null ? '' : (size < 5000 ? 'S' : size < 15000 ? 'M' : 'L'), enrollment: n(size),
    acceptRate: ar == null ? null : Math.round(ar * 1000) / 10,
    actLow: n(r['latest.admissions.act_scores.25th_percentile.cumulative']),
    actHigh: n(r['latest.admissions.act_scores.75th_percentile.cumulative']),
    satAvg: n(r['latest.admissions.sat_scores.average.overall']),
    cost: n(r['latest.cost.attendance.academic_year']),
    tuitionIn: n(r['latest.cost.tuition.in_state']), tuitionOut: n(r['latest.cost.tuition.out_of_state']), netPrice: n(r['latest.cost.avg_net_price.overall']),
    gradRate: grad == null ? null : Math.round(grad * 100),
    retention: ret == null ? null : Math.round(ret * 100),
    source: 'COLLEGE_SCORECARD', dataYear: 'latest', _src: 'scorecard'
  };
}

async function call(params) {
  if (!apiKey()) { const e = new Error('NOT_CONFIGURED'); e.code = 'NOT_CONFIGURED'; throw e; }
  const qs = new URLSearchParams(Object.assign({ api_key: apiKey(), per_page: '20', fields: FIELDS }, params));
  let res;
  try { res = await fetch(BASE + '?' + qs.toString()); }
  catch (e) { const er = new Error('NETWORK_ERROR'); er.code = 'NETWORK'; throw er; }
  if (res.status === 429) { const e = new Error('RATE_LIMITED'); e.code = 'RATE_LIMITED'; throw e; }
  if (res.status === 403) { const e = new Error('Invalid or unauthorized API key'); e.code = 'FORBIDDEN'; throw e; }
  if (!res.ok) { const e = new Error('UPSTREAM_' + res.status); e.code = 'UPSTREAM'; throw e; }
  return res.json();
}
async function searchColleges(q) {
  const params = { 'school.degrees_awarded.predominant': '3,4' };
  if (q.name) params['school.name'] = q.name;
  if (q.state) params['school.state'] = String(q.state).toUpperCase();
  if (q.control === 'public') params['school.ownership'] = 1;
  if (q.control === 'private') params['school.ownership'] = 2;
  const data = await call(params); return (data.results || []).map(normalize);
}
async function getById(id) { const data = await call({ id: String(id) }); return (data.results || []).map(normalize)[0] || null; }

exports.handler = async (event) => {
  // Path after the function name, e.g. "/status", "/colleges/search", "/colleges/240727"
  let sub = (event.path || '').replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '') || '/';  if (sub === '' ) sub = '/';
  const q = event.queryStringParameters || {};
  try {
    if (sub === '/status' || sub === '/status/') {
      return json(200, { scorecard: { status: !apiKey() ? 'NOT_CONFIGURED' : 'CONNECTED', keyConfigured: !!apiKey(), lastSuccess: null, message: apiKey() ? 'Key configured' : 'Missing key' }, ipeds: { status: 'NOT_IMPORTED' } });
    }
    if (sub === '/colleges/search') {
      try { const results = await searchColleges(q); return json(200, { source: 'scorecard', results }); }
      catch (e) { return json(e.code === 'NOT_CONFIGURED' ? 400 : e.code === 'RATE_LIMITED' ? 429 : 502, { error: e.message }); }
    }
    if (sub === '/colleges/test') {
      try { await call({ 'school.name': 'Vanderbilt University' }); return json(200, { ok: true }); }
      catch (e) { return json(200, { ok: false, error: e.message }); }
    }
    const m = sub.match(/^\/colleges\/([^\/]+)$/);
    if (m) {
      try { const rec = await getById(decodeURIComponent(m[1])); return rec ? json(200, rec) : json(404, { error: 'NOT_FOUND' }); }
      catch (e) { return json(e.code === 'NOT_CONFIGURED' ? 400 : 502, { error: e.message }); }
    }
    return json(404, { error: 'NOT_FOUND' });
  } catch (e) { return json(500, { error: 'SERVER_ERROR' }); }
};
