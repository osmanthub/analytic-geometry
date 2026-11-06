/* Only course learning records enter a backup, never unrelated browser data. */
(function (root) {
  'use strict';
  const TOPICS = 'geometry-topics-v3', WORKED = 'geometry-worked-v1';
  const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const safeKey = k => typeof k === 'string' && k.length <= 150 && !['__proto__', 'constructor', 'prototype'].includes(k);
  function validate(value) {
    if (!plain(value) || value.course !== 'geometry-lab' || value.schema !== 1 || !Array.isArray(value.topics) || !plain(value.records)) throw Error('这不是本课程的学习记录备份。');
    if (value.topics.length > 2000 || Object.keys(value.records).length > 2000 || !value.topics.every(safeKey)) throw Error('备份的记录格式不正确。');
    const records = Object.create(null);
    for (const [id, r] of Object.entries(value.records)) {
      if (!safeKey(id) || !plain(r) || !Array.isArray(r.notes) || r.notes.length > 30 || !r.notes.every(s => typeof s === 'string' && s.length <= 100000) || typeof r.reflection !== 'string' || r.reflection.length > 100000 || typeof r.viewed !== 'boolean') throw Error('备份中的习题记录不完整或格式不正确。');
      records[id] = {notes: r.notes.slice(), reflection: r.reflection, viewed: r.viewed};
    }
    return {course: 'geometry-lab', schema: 1, topics: [...new Set(value.topics)], records};
  }
  function read(storage) {
    const records=JSON.parse(storage.getItem(WORKED)||'{}');
    // A student may write stage 2 before stage 1; JSON encodes those empty slots as null.
    if(plain(records))for(const r of Object.values(records))if(plain(r)&&Array.isArray(r.notes))r.notes=Array.from(r.notes,s=>s==null?'':s);
    return validate({course:'geometry-lab',schema:1, topics:JSON.parse(storage.getItem(TOPICS)||'[]'), records});
  }
  function merge(current, incoming) {
    current = validate(current); incoming = validate(incoming);
    const records = Object.assign(Object.create(null), incoming.records);
    let conflicts = 0;
    for (const [id, r] of Object.entries(current.records)) {
      const old = records[id];
      if (!old) {records[id] = r; continue;}
      const keep = (a, b) => { if (a.trim() && b.trim() && a !== b) conflicts++; return a.trim() ? a : b; };
      records[id] = {notes:Array.from({length:Math.max(r.notes.length, old.notes.length)}, (_,i)=>keep(r.notes[i]||'',old.notes[i]||'')),reflection:keep(r.reflection, old.reflection),viewed:r.viewed||old.viewed};
    }
    return {data:{course:'geometry-lab',schema:1,topics:[...new Set([...current.topics, ...incoming.topics])],records},conflicts};
  }
  function restore(storage, incoming) {
    const result = merge(read(storage), incoming);
    const before = [storage.getItem(TOPICS), storage.getItem(WORKED)];
    try { storage.setItem(TOPICS,JSON.stringify(result.data.topics)); storage.setItem(WORKED,JSON.stringify(result.data.records)); }
    catch (e) {
      try { [TOPICS,WORKED].forEach((key,i)=>before[i] === null ? storage.removeItem(key) : storage.setItem(key,before[i])); }
      catch { throw Error('恢复失败，设备存储不可用。请保留备份文件，释放空间后再试。'); }
      throw Error('存储空间不足或浏览器限制写入，已保留恢复前的记录。');
    }
    return result;
  }
  const api = {validate, read, merge, restore};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GeometryBackup = api;
})(typeof window === 'undefined' ? globalThis : window);
