/* Behavior tests for the actual worker, including its persistent CacheStorage protocol. */
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../docs/sw.js'), 'utf8');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixtures(revision = 1) {
  const assets = new Map([
    ['index.html', `<html>course ${revision}</html>`],
    ['app.js', `window.revision=${revision};`],
    ['reader.html', '<html>reader</html>'],
    ['lectures/讲义.pdf', '%PDF-1.7\nlocal course\n%%EOF'],
  ]);
  const files = [...assets].map(([url, body]) => ({url, bytes: Buffer.byteLength(body), sha256: sha(body)}));
  return {assets, manifest: {version: 'sha256-' + sha(JSON.stringify(files)), count: files.length, bytes: files.reduce((n, f) => n + f.bytes, 0), files}};
}
function environment(scope = 'https://course.test/geometry/') {
  const stores = new Map();
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {async put(key, value) { store.set(typeof key === 'string' ? key : key.url, value.clone()); }, async match(key) { return store.get(typeof key === 'string' ? key : key.url)?.clone(); }};
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const env = {stores, caches, scope, network: fixtures(), offline: false, wrong: null, delay: 0, calls: [], redirect: false};
  env.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    env.calls.push(url);
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (env.delay) await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, env.delay);
      options.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, {once: true});
    });
    if (env.offline) throw new TypeError('Network unavailable');
    const relative = decodeURI(new URL(url).pathname.slice(new URL(scope).pathname.length));
    if (env.hook) { const custom = await env.hook(relative, options); if (custom) return custom; }
    let body = relative === 'offline-manifest.json' ? JSON.stringify(env.network.manifest) : env.network.assets.get(relative);
    if (env.wrong === relative) body = '<html>Please sign in</html>';
    if (body === undefined) return new Response('Not found', {status: 404});
    const response = new Response(body, {status: 200});
    Object.defineProperty(response, 'url', {value: env.redirect ? 'https://login.test/' : url});
    Object.defineProperty(response, 'redirected', {value: env.redirect});
    return response;
  };
  env.restart = () => {
    const listeners = {};
    const self = {registration: {scope}, addEventListener(type, handler) { listeners[type] = handler; }, skipWaiting: async () => {}, clients: {claim: async () => {}}};
    vm.runInNewContext(source, {self, caches, fetch: env.fetch, crypto: crypto.webcrypto, URL, Response, Headers, TextEncoder, TextDecoder, AbortController, Date, Math, console, setTimeout: (fn, ms) => setTimeout(fn, env.shortTimeout && ms === 45000 ? 10 : ms), clearTimeout});
    env.command = type => {
      const messages = [];
      let done;
      listeners.message({data: {type}, ports: [{postMessage(message) { messages.push(message); }}], waitUntil(promise) { done = promise; }});
      return {messages, done: Promise.resolve().then(() => done)};
    };
    env.request = async (relative, options = {}) => {
      const request = new Request(new URL(relative, scope), options);
      let response;
      listeners.fetch({request, respondWith(promise) { response = promise; }});
      return response ? await response : env.fetch(request);
    };
  };
  env.restart();
  return env;
}
async function command(env, type) { const job = env.command(type); await job.done; return job.messages; }
async function last(env, type) { return (await command(env, type)).at(-1); }
(async () => {
  const env = environment();
  assert.equal((await last(env, 'STATUS')).ready, false);
  assert.equal((await last(env, 'CHECK')).manifest.count, 4);
  let result = await command(env, 'DOWNLOAD');
  assert.equal(result.at(-1).type, 'complete');
  assert.deepEqual(result.filter(m => m.type === 'progress').map(m => m.done), [0, 1, 2, 3, 4]);
  const oldVersion = result.at(-1).version;
  env.restart();
  assert.equal((await last(env, 'STATUS')).ready, true);
  env.offline = true;
  const before = env.calls.length;
  assert.match(await (await env.request('')).text(), /course 1/);
  assert.match(await (await env.request('app.js?v=123')).text(), /revision=1/);
  assert.match(await (await env.request('reader.html?doc=chapter1&page=9')).text(), /reader/);
  assert.match(await (await env.request('reader?doc=chapter1&page=9')).text(), /reader/);
  const pdf = await env.request('lectures/讲义.pdf', {headers: {Range: 'bytes=1-8'}});
  assert.equal(pdf.status, 200);
  assert.match(await pdf.text(), /^%PDF-1.7/);
  assert.equal(env.calls.length, before, 'Known course resources must not use network offline');
  assert.equal((await last(env, 'CHECK')).type, 'error');
  assert.equal((await last(env, 'DOWNLOAD')).type, 'error');
  assert.equal((await last(env, 'STATUS')).version, oldVersion);
  assert.equal((await last(env, 'STATUS')).ready, true);
  env.offline = false;
  env.network = fixtures(2);
  env.wrong = 'app.js';
  assert.equal((await last(env, 'DOWNLOAD')).type, 'error', 'Login HTML / hash mismatch is rejected');
  assert.equal((await last(env, 'STATUS')).version, oldVersion);
  assert.equal((await last(env, 'STATUS')).ready, true);
  assert.match(await (await env.request('')).text(), /course 1/);
  env.wrong = null;
  env.redirect = true;
  assert.equal((await last(env, 'DOWNLOAD')).type, 'error', 'Redirect to login is rejected');
  env.redirect = false;
  env.delay = 50;
  const pending = env.command('DOWNLOAD');
  await pause(65); // Manifest received; assets are in flight.
  assert.equal((await last(env, 'STATUS')).busy, true);
  assert.equal((await last(env, 'CANCEL')).type, 'cancelled');
  await pending.done;
  assert.equal(pending.messages.at(-1).type, 'cancelled');
  assert.equal((await last(env, 'STATUS')).version, oldVersion);
  assert.equal((await last(env, 'STATUS')).ready, true);
  assert.equal((await env.caches.keys()).filter(n => n.includes(':snapshot-')).length, 1, 'Cancelled stages are removed');
  env.delay = 0;
  assert.notEqual((await last(env, 'CHECK')).manifest.version, oldVersion);
  assert.equal((await last(env, 'DOWNLOAD')).type, 'complete');
  env.restart();
  assert.equal((await last(env, 'STATUS')).version, env.network.manifest.version);
  assert.match(await (await env.request('')).text(), /course 2/);
  const activeName = (await env.caches.keys()).find(n => n.includes(':snapshot-'));
  env.stores.get(activeName).delete(new URL('app.js', env.scope).href);
  assert.equal((await last(env, 'STATUS')).ready, false, 'Missing resources invalidate offline-ready status');
  env.network = fixtures(3);
  assert.equal((await env.request('app.js')).status, 503, 'Eviction cannot mix a different release into the cached course');
  env.network = fixtures(2);
  assert.equal((await last(env, 'DOWNLOAD')).type, 'complete', 'Can repair lost cache');
  const repairedName = (await env.caches.keys()).find(n => n.includes(':snapshot-'));
  env.stores.get(repairedName).set(new URL('app.js', env.scope).href, new Response('x', {headers: {'content-length': String(env.network.assets.get('app.js').length)}}));
  assert.equal((await last(env, 'STATUS')).ready, false, 'Body length checked independently of header');
  const root = environment('https://course.test/');
  assert.equal((await last(root, 'DOWNLOAD')).type, 'complete');
  root.offline = true;
  assert.match(await (await root.request('')).text(), /course 1/);
  root.network.manifest.version = 'sha256-' + '0'.repeat(64);
  root.offline = false;
  assert.equal((await last(root, 'CHECK')).type, 'error', 'Tampered inventory rejected');
  // A temporary server/network/body failure retries, preserving strict hash validation.
  for (const failureMode of ['408', '429', '503', 'network', 'body']) {
    const retry = environment();
    let tries = 0;
    retry.hook = async relative => {
      if (relative !== 'app.js' || ++tries > 1) return null;
      if (failureMode === 'network') throw new TypeError('temporary connection failure');
      if (failureMode === 'body') { const response = new Response(''); response.arrayBuffer = async () => { throw new TypeError('temporary stream failure'); }; return response; }
      return new Response('', {status: Number(failureMode)});
    };
    assert.equal((await last(retry, 'DOWNLOAD')).type, 'complete', `${failureMode} recovers`);
    assert.equal(tries, 2);
  }
  const originalCause = environment();
  originalCause.hook = async (relative, options) => {
    if (relative === 'index.html') await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 10000);
      options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, {once: true});
    });
    if (relative === 'app.js') return new Response('Forbidden', {status: 403});
    return null;
  };
  const originalError = await last(originalCause, 'DOWNLOAD');
  assert.equal(originalError.type, 'error');
  assert.match(originalError.message, /app.js.*HTTP 403/);
  assert.equal(originalCause.calls.filter(url => url.endsWith('app.js')).length, 1, '403 is permanent');
  const exhausted = environment();
  exhausted.hook = async relative => relative === 'app.js' ? new Response('', {status: 503}) : null;
  assert.match((await last(exhausted, 'DOWNLOAD')).message, /app.js.*HTTP 503.*3 次/);
  assert.equal(exhausted.calls.filter(url => url.endsWith('app.js')).length, 3);
  const retryCancel = environment();
  retryCancel.hook = exhausted.hook;
  const retryPending = retryCancel.command('DOWNLOAD');
  while (!retryCancel.calls.some(url => url.endsWith('app.js'))) await pause(1);
  await pause(20);
  await last(retryCancel, 'CANCEL');
  await retryPending.done;
  assert.equal(retryPending.messages.at(-1).type, 'cancelled');
  assert.equal(retryCancel.calls.filter(url => url.endsWith('app.js')).length, 1, 'Cancel aborts backoff without retry');
  const timeout = environment();
  timeout.shortTimeout = true;
  let timeoutCalls = 0;
  timeout.hook = async (relative, options) => {
    if (relative !== 'app.js' || ++timeoutCalls > 1) return null;
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true}));
  };
  assert.equal((await last(timeout, 'DOWNLOAD')).type, 'complete', 'Per-request timeout retries');
  assert.equal(timeoutCalls, 2);
  const canonical = environment();
  canonical.hook = async relative => relative === 'index.html' ? new Response('', {status: 302}) : relative === '' ? new Response(canonical.network.assets.get('index.html')) : null;
  assert.equal((await last(canonical, 'DOWNLOAD')).type, 'complete', 'Known same-origin index canonical URL is supported');
  canonical.hook = async relative => relative === 'reader.html' ? new Response('', {status: 302}) : relative === 'reader' ? new Response(canonical.network.assets.get('reader.html')) : null;
  assert.equal((await last(canonical, 'DOWNLOAD')).type, 'complete', 'Manifest-listed HTML canonical URL is supported');
  canonical.offline = true;
  assert.match(await (await canonical.request('reader?doc=chapter1&page=9')).text(), /reader/);
  canonical.offline = false;
  canonical.hook = async relative => relative === 'index.html' || relative === '' ? new Response('', {status: 302}) : null;
  assert.match((await last(canonical, 'DOWNLOAD')).message, /index.html.*重定向/);
  canonical.hook = async relative => relative === 'index.html' ? new Response('', {status: 302}) : relative === '' ? new Response('<html>sign in</html>') : null;
  assert.match((await last(canonical, 'DOWNLOAD')).message, /校验失败.*index.html/);
  console.log('PASS: retry 408/429/503/network/body, timeout, bounded attempts, cancel during retry, first cause retained, canonical index strict hash;');
  console.log('PASS: complete download, durable restart, root/subdirectory deployment, query URLs, PDF Range full response, offline fetch, hash/login rejection, failed update preserves old course, cancellation, update, cache eviction and repair.');
})().catch(error => { console.error(error); process.exitCode = 1; });
