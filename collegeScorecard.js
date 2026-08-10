/* ============================================================
   CollegeScorecardService
   Reusable server-side wrapper around the U.S. Dept. of Education
   College Scorecard API. The API key is read from the environment
   variable COLLEGE_SCORECARD_API_KEY and NEVER sent to the browser.

   Docs: https://collegescorecard.ed.gov/data/api-documentation/
============================================================ */
'use strict';

const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';

/* Only request fields the official API actually documents. */
const FIELDS = [
  'id',
  'school.name', 'school.city', 'school.state', 'school.zip', 'school.school_url',
  'school.ownership', 'school.locale',
  'latest.student.size',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.act_scores.25th_percentile.cumulative',
  'latest.admissions.act_scores.75th_percentile.cumulative',
  'latest.admissions.sat_scores.average.overall',
  'latest.cost.attendance.academic_year',
  'latest.cost.tuition.in_state',
  'latest.cost.tuition.out_of_state',
  'latest.cost.avg_net_price.overall',
  'latest.completion.completion_rate_4yr_150nt',
  'latest.student.retention_rate.four_year.full_time'
].join(',');

const LOCALE = { 11:'city',12:'city',13:'city',21:'suburban',22:'suburban',23:'suburban',31:'town',32:'town',33:'town',41:'town',42:'town',43:'town' };

/* Simple in-memory cache so we don't hammer the government API. */
const TTL = 1000 * 60 * 60 * 12; // 12h
const cache = new Map();

let lastSuccess = null;
let lastError = null;

function apiKey() { return (process.env.COLLEGE_SCORECARD_API_KEY || '').trim(); }
function err(code, msg) { const e = new Error(msg || code); e.code = code; return e; }
function n(v) { return (v === null || v === undefined) ? null : v; } // NULL stays null — never 0

/* Map one raw Scorecard record → our normalized shape. Missing = null. */
function normalize(r) {
  const own = r['school.ownership'];
  const size = r['latest.student.size'];
  const ar = r['latest.admissions.admission_rate.overall'];
  const grad = r['latest.completion.completion_rate_4yr_150nt'];
  const ret = r['latest.student.retention_rate.four_year.full_time'];
  return {
    id: r['id'], unitid: r['id'],
    name: r['school.name'], city: r['school.city'], state: r['school.state'], zip: r['school.zip'] || null,
    website: r['school.school_url'] || null,
    control: own === 1 ? 'public' : (own === 2 || own === 3) ? 'private' : '',
    setting: LOCALE[r['school.locale']] || '',
    size: size == null ? '' : (size < 5000 ? 'S' : size < 15000 ? 'M' : 'L'),
    enrollment: n(size),
    acceptRate: ar == null ? null : Math.round(ar * 1000) / 10,      // % with 1 decimal
    actLow: n(r['latest.admissions.act_scores.25th_percentile.cumulative']),
    actHigh: n(r['latest.admissions.act_scores.75th_percentile.cumulative']),
    satAvg: n(r['latest.admissions.sat_scores.average.overall']),
    cost: n(r['latest.cost.attendance.academic_year']),
    tuitionIn: n(r['latest.cost.tuition.in_state']),
    tuitionOut: n(r['latest.cost.tuition.out_of_state']),
    netPrice: n(r['latest.cost.avg_net_price.overall']),
    gradRate: grad == null ? null : Math.round(grad * 100),
    retention: ret == null ? null : Math.round(ret * 100),
    source: 'COLLEGE_SCORECARD',
    dataYear: 'latest',           // Scorecard "latest" = most recent reporting year available
    _src: 'scorecard'
  };
}

async function call(params) {
  if (!apiKey()) throw err('NOT_CONFIGURED', 'NOT_CONFIGURED');
  if (typeof fetch === 'undefined') throw err('NODE_TOO_OLD', 'This server needs Node 18+ (global fetch). Please upgrade Node.');
  const qs = new URLSearchParams(Object.assign({ api_key: apiKey(), per_page: '20', fields: FIELDS }, params));
  let res;
  try { res = await fetch(BASE + '?' + qs.toString()); }
  catch (e) { lastError = 'NETWORK_ERROR'; throw err('NETWORK_ERROR', 'NETWORK_ERROR'); }
  if (res.status === 429) { lastError = 'RATE_LIMITED'; throw err('RATE_LIMITED', 'RATE_LIMITED'); }
  if (res.status === 403) { lastError = 'FORBIDDEN'; throw err('FORBIDDEN', 'Invalid or unauthorized API key'); }
  if (!res.ok) { lastError = 'UPSTREAM_' + res.status; throw err('UPSTREAM', 'UPSTREAM_' + res.status); }
  const data = await res.json();
  lastSuccess = Date.now(); lastError = null;
  return data;
}

async function searchColleges({ name, state, control } = {}) {
  const params = { 'school.degrees_awarded.predominant': '3,4' }; // 4-year (bachelor's/graduate) institutions
  if (name) params['school.name'] = name;
  if (state) params['school.state'] = String(state).toUpperCase();
  if (control === 'public') params['school.ownership'] = 1;
  if (control === 'private') params['school.ownership'] = 2;
  const ck = 's:' + JSON.stringify({ name: name || '', state: state || '', control: control || '' });
  const hit = cache.get(ck); if (hit && Date.now() - hit.t < TTL) return hit.v;
  const data = await call(params);
  const results = (data.results || []).map(normalize);
  cache.set(ck, { t: Date.now(), v: results });
  return results;
}

async function getCollegeById(id) {
  const ck = 'id:' + id; const hit = cache.get(ck); if (hit && Date.now() - hit.t < TTL) return hit.v;
  const data = await call({ id: String(id) });
  const rec = (data.results || []).map(normalize)[0] || null;
  cache.set(ck, { t: Date.now(), v: rec });
  return rec;
}

async function getCollegeByName(name) {
  const list = await searchColleges({ name });
  return list.find(r => (r.name || '').toLowerCase() === String(name).toLowerCase()) || list[0] || null;
}

async function getCollegePrograms(id) {
  if (!apiKey()) throw err('NOT_CONFIGURED', 'NOT_CONFIGURED');
  const qs = new URLSearchParams({ api_key: apiKey(), fields: 'id,latest.programs.cip_4_digit.title,latest.programs.cip_4_digit.credential.title', id: String(id), per_page: '1' });
  const res = await fetch(BASE + '?' + qs.toString());
  if (!res.ok) throw err('UPSTREAM', 'UPSTREAM_' + res.status);
  const data = await res.json();
  const progs = ((data.results || [])[0] || {})['latest.programs.cip_4_digit'] || [];
  lastSuccess = Date.now();
  const titles = Array.from(new Set(progs.map(p => p && p.title).filter(Boolean)));
  return titles;
}

async function test() { await call({ 'school.name': 'Vanderbilt University' }); return true; }

function status() {
  return {
    status: !apiKey() ? 'NOT_CONFIGURED' : (lastError ? 'ERROR' : 'CONNECTED'),
    keyConfigured: !!apiKey(),
    lastSuccess: lastSuccess,
    message: lastError ? lastError : (lastSuccess ? 'OK' : 'Key configured — not yet tested')
  };
}

module.exports = { searchColleges, getCollegeById, getCollegeByName, getCollegePrograms, test, status };
