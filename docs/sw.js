/* Complete, verified course snapshots. A partial download never replaces a working copy. */
'use strict';
const SCOPE = new URL(self.registration.scope);
const PREFIX = `geometry-offline:${encodeURIComponent(SCOPE.pathname)}:`;
const META_CACHE = `${PREFIX}metadata-v1`;
const META_URL = new URL('__offline_snapshot__', SCOPE).href;
let snapshotMemo;
let downloadJob = null;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function tell(port, data) { try { port.postMessage(data); } catch (_) {} }
function failure(message) { throw new Error(message); }
function assetURL(relative) { return new URL(relative, SCOPE).href; }
function hex(buffer) { return Array.from(new Uint8Array(buffer), n => n.toString(16).padStart(2, '0')).join(''); }
async function digest(buffer) { return hex(await crypto.subtle.digest('SHA-256', buffer)); }
function validateShape(m) {
  if (!m || !/^sha256-[a-f0-9]{64}$/.test(m.version) || !Array.isArray(m.files) || !m.files.length || m.files.length > 20000) failure('离线资源清单格式无效。');
  let total = 0;
  const urls = new Set();
  for (const f of m.files) {
    if (!f || typeof f.url !== 'string' || !f.url || /[?#\\]/.test(f.url) || f.url.startsWith('/') || /^[a-z]+:/i.test(f.url)) failure('离线资源路径无效。');
    let decoded;
    try { decoded = decodeURIComponent(f.url); } catch (_) { failure('离线资源路径编码无效。'); }
    if (decoded.split('/').some(p => !p || p === '.' || p === '..') || /[?#\\]/.test(decoded)) failure('离线资源路径越界。');
    const absolute = new URL(f.url, SCOPE);
    if (absolute.origin !== SCOPE.origin || !absolute.pathname.startsWith(SCOPE.pathname) || urls.has(absolute.href)) failure('离线资源路径重复或越界。');
    if (!Number.isSafeInteger(f.bytes) || f.bytes < 0 || !/^[a-f0-9]{64}$/.test(f.sha256)) failure('离线资源校验信息无效。');
    urls.add(absolute.href);
    total += f.bytes;
  }
  if (!urls.has(assetURL('index.html')) || m.count !== m.files.length || m.bytes !== total || !Number.isSafeInteger(total)) failure('离线资源清单不完整。');
  return m;
}
async function readSnapshot(refresh = false) {
  if (!refresh && snapshotMemo !== undefined) return snapshotMemo;
  const cache = await caches.open(META_CACHE);
  const response = await cache.match(META_URL);
  try {
    const stored = response ? await response.json() : null;
    if (stored && stored.schema === 1 && typeof stored.cacheName === 'string' && stored.cacheName.startsWith(`${PREFIX}snapshot-`)) {
      validateShape(stored.manifest);
      snapshotMemo = stored;
    } else snapshotMemo = null;
  } catch (_) { snapshotMemo = null; }
  return snapshotMemo;
}
async function status() {
  const saved = await readSnapshot(true);
  let ready = !!saved;
  if (saved) {
    const cache = await caches.open(saved.cacheName);
    // Inspect actual body lengths, not just a header which might survive damaged storage.
    for (let i = 0; i < saved.manifest.files.length && ready; i += 8) {
      const group = saved.manifest.files.slice(i, i + 8);
      ready = (await Promise.all(group.map(async f => {
        const response = await cache.match(assetURL(f.url));
        return !!response && response.status === 200 && (await response.arrayBuffer()).byteLength === f.bytes;
      }))).every(Boolean);
    }
  }
  return {type: 'status', ready, version: saved?.manifest.version || null, count: saved?.manifest.count || 0, bytes: saved?.manifest.bytes || 0, busy: !!downloadJob};
}
function aborted() { const error = new Error('下载已中断。'); error.name = 'AbortError'; return error; }
function retryDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(aborted()); return; }
    const finish = () => { signal?.removeEventListener('abort', stop); resolve(); };
    const timer = setTimeout(finish, ms);
    const stop = () => { clearTimeout(timer); signal?.removeEventListener('abort', stop); reject(aborted()); };
    signal?.addEventListener('abort', stop, {once: true});
  });
}
async function networkResource(url, signal, allowHTMLCanonical = false) {
  const label = decodeURI(new URL(url).pathname.slice(SCOPE.pathname.length));
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (signal?.aborted) throw aborted();
    const controller = new AbortController();
    let timedOut = false;
    const stop = () => controller.abort();
    signal?.addEventListener('abort', stop, {once: true});
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 45000);
    let problem;
    try {
      // Manual redirects reveal authentication redirects without following them or
      // mistaking their generic Fetch TypeError for a transient network failure.
      const options = {cache: 'no-store', credentials: 'same-origin', redirect: 'manual', signal: controller.signal};
      let response = await fetch(url, options);
      let expectedURL = url;
      if (allowHTMLCanonical && new URL(url).pathname.endsWith('.html') && (response.type === 'opaqueredirect' || response.status >= 300 && response.status < 400)) {
        // Only manifest-listed HTML can use a known same-origin canonical alias.
        // Never follow the hidden/unknown redirect destination. The caller still
        // verifies the response against that HTML resource's exact SHA-256.
        const canonical = new URL(url);
        canonical.pathname = canonical.pathname.endsWith('/index.html') ? canonical.pathname.slice(0, -10) : canonical.pathname.slice(0, -5);
        expectedURL = canonical.href;
        response = await fetch(expectedURL, options);
      }
      if (response.redirected || response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400) || (response.url && new URL(response.url).href !== new URL(expectedURL).href) || response.type === 'opaque') {
        const error = new Error('重定向或登录权限失效'); error.retryable = false; throw error;
      }
      if (response.status !== 200) {
        const error = new Error(`HTTP ${response.status}`);
        error.retryable = response.status === 408 || response.status === 429 || response.status >= 500 && response.status <= 599;
        throw error;
      }
      // Include body streaming in the timeout and retry boundary, not only headers.
      const body = await response.arrayBuffer();
      if (signal?.aborted) throw aborted();
      return {response, body};
    } catch (error) {
      if (signal?.aborted) throw aborted();
      const transient = timedOut || error.retryable === true || (error.retryable !== false && (error.name === 'TypeError' || error.name === 'AbortError' || error.name === 'NetworkError'));
      const detail = timedOut ? '单次请求超过 45 秒' : error.message || error.name || '网络错误';
      problem = new Error(`下载失败：${label}（${detail}，已尝试 ${attempt} 次）。原有离线课程仍保留。`);
      if (!transient || attempt === 3) throw problem;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
    }
    await retryDelay(attempt === 1 ? 500 : 1500, signal);
  }
}
async function fetchManifest(signal) {
  const {body} = await networkResource(assetURL('offline-manifest.json'), signal);
  const text = new TextDecoder().decode(body);
  if (text.length > 3000000) failure('离线资源清单过大。');
  let manifest;
  try { manifest = JSON.parse(text); } catch (_) { failure('无法读取课程清单，请检查网络和访问权限。'); }
  validateShape(manifest);
  const canonical = JSON.stringify(manifest.files.map(f => ({url: f.url, bytes: f.bytes, sha256: f.sha256})));
  if (`sha256-${await digest(new TextEncoder().encode(canonical))}` !== manifest.version) failure('离线资源清单校验失败。');
  return manifest;
}
async function download(port, job) {
  let stageName;
  try {
    const manifest = await fetchManifest(job.controller.signal);
    stageName = `${PREFIX}snapshot-${manifest.version}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const cache = await caches.open(stageName);
    let next = 0, done = 0, bytes = 0;
    tell(port, {type: 'progress', done, total: manifest.count, bytes, totalBytes: manifest.bytes});
    const runners = Array.from({length: Math.min(4, manifest.count)}, async () => {
      while (next < manifest.count) {
        if (job.cancelled) failure('下载已取消。');
        const file = manifest.files[next++];
        const {response, body} = await networkResource(assetURL(file.url), job.controller.signal, true);
        if (body.byteLength !== file.bytes || await digest(body) !== file.sha256) failure(`资源校验失败：${file.url}。原有离线课程仍保留。`);
        if (job.cancelled) failure('下载已取消。');
        const headers = new Headers(response.headers);
        headers.delete('content-encoding');
        headers.delete('transfer-encoding');
        headers.set('content-length', String(body.byteLength));
        await cache.put(assetURL(file.url), new Response(body, {status: 200, headers}));
        done++;
        bytes += body.byteLength;
        tell(port, {type: 'progress', done, total: manifest.count, bytes, totalBytes: manifest.bytes});
      }
    });
    // Await every runner before deleting a failed stage, so no late write can recreate it.
    let firstFailure;
    await Promise.allSettled(runners.map(p => p.catch(error => {
      // Preserve the initiating failure; sibling aborts must not hide its resource/status.
      if (!firstFailure) firstFailure = error;
      job.controller.abort();
      throw error;
    })));
    if (firstFailure) throw firstFailure;
    if (job.cancelled) failure('下载已取消。');
    const saved = {schema: 1, cacheName: stageName, manifest};
    const metadata = await caches.open(META_CACHE);
    if (job.cancelled) failure('下载已取消。');
    job.committing = true;
    // One atomic cache entry is the commit point. Before it, all readers use the old copy.
    await metadata.put(META_URL, new Response(JSON.stringify(saved), {headers: {'content-type': 'application/json'}}));
    snapshotMemo = saved;
    stageName = null;
    tell(port, {type: 'complete', version: manifest.version, count: manifest.count, bytes: manifest.bytes});
    // Cleanup is best-effort; a cleanup error cannot turn a successful commit into a failure.
    try {
      for (const name of await caches.keys()) if (name.startsWith(`${PREFIX}snapshot-`) && name !== saved.cacheName) await caches.delete(name);
    } catch (_) {}
  } catch (error) {
    if (stageName) try { await caches.delete(stageName); } catch (_) {}
    tell(port, job.cancelled ? {type: 'cancelled'} : {type: 'error', message: error.name === 'AbortError' ? '下载中断，原有离线课程仍保留，请重试。' : error.message || '离线保存失败，请检查设备存储空间。'});
  } finally { if (downloadJob === job) downloadJob = null; }
}
self.addEventListener('message', event => {
  const port = event.ports?.[0];
  if (!port) return;
  event.waitUntil((async () => {
    try {
      switch (event.data?.type) {
        case 'STATUS': tell(port, await status()); break;
        case 'CHECK': {
          const manifest = await fetchManifest();
          const current = await readSnapshot(true);
          tell(port, {type: 'available', manifest: {version: manifest.version, count: manifest.count, bytes: manifest.bytes}, currentVersion: current?.manifest.version || null});
          break;
        }
        case 'DOWNLOAD': {
          if (downloadJob) { tell(port, {type: 'error', message: '课程正在下载，请等待完成或先取消。'}); break; }
          const job = {controller: new AbortController(), cancelled: false, committing: false};
          downloadJob = job;
          await download(port, job);
          break;
        }
        case 'CANCEL':
          if (downloadJob?.committing) { tell(port, {type: 'error', message: '课程已下载完成，正在保存，请稍候。'}); break; }
          if (downloadJob) { downloadJob.cancelled = true; downloadJob.controller.abort(); }
          tell(port, {type: 'cancelled'});
          break;
        default: tell(port, {type: 'error', message: '未知的离线操作。'});
      }
    } catch (error) { tell(port, {type: 'error', message: error.message || '无法读取离线状态。'}); }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const relative = decodeURI(url.pathname.slice(SCOPE.pathname.length));
  if (relative === 'offline-manifest.json' || relative === 'sw.js') return;
  event.respondWith((async () => {
    const saved = await readSnapshot();
    if (saved) {
      const cache = await caches.open(saved.cacheName);
      let path = url.pathname === SCOPE.pathname ? 'index.html' : relative;
      // Static hosts expose reader.html as /reader. Resolve only aliases backed by
      // a file in the committed manifest, so canonical navigations also work offline.
      if (!saved.manifest.files.some(file => file.url === path)) {
        const aliases = path.endsWith('/') ? [`${path}index.html`] : [`${path}.html`, `${path}/index.html`];
        const canonical = aliases.find(alias => saved.manifest.files.some(file => file.url === alias));
        if (canonical) path = canonical;
      }
      const response = await cache.match(assetURL(path));
      // Return the complete 200 response for Range requests: valid HTTP behavior and
      // supported by PDF.js, which falls back to the full cached PDF without a network call.
      if (response) return response;
      const expected = saved.manifest.files.find(file => assetURL(file.url) === assetURL(path));
      if (expected) {
        // Eviction must not splice a new release into an old cached course.
        try {
          const {response: fresh, body} = await networkResource(assetURL(expected.url), undefined, true);
          if (body.byteLength !== expected.bytes || await digest(body) !== expected.sha256) failure('课程版本不匹配。');
          const headers = new Headers(fresh.headers);
          headers.delete('content-encoding');
          headers.delete('transfer-encoding');
          headers.set('content-length', String(body.byteLength));
          return new Response(body, {status: 200, headers});
        } catch (_) {
          return new Response('离线资源不完整，请联网后打开“离线学习”并重新下载完整课程。', {status: 503, headers: {'content-type': 'text/plain; charset=utf-8'}});
        }
      }
    }
    return fetch(request);
  })());
});
