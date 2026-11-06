/* Student-facing offline controls. Course content remains in the existing pages. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), panel = $('offline');
  const supported = 'serviceWorker' in navigator && window.isSecureContext;
  let registration, installPrompt, downloading = false, pendingBackup, latest, readyVersion = '';
  const size = bytes => (bytes / 1024 / 1024).toFixed(1) + ' MB';
  const message = (text, error = false) => { if ($('offlineMessage')) { $('offlineMessage').textContent = text; $('offlineMessage').classList.toggle('is-error', error); } };
  const register = supported ? navigator.serviceWorker.register('./sw.js', {scope:'./',updateViaCache:'none'}).then(() => navigator.serviceWorker.ready).then(r => {registration = r; return r;}) : Promise.reject(Error('请在 Safari、Chrome 或 Edge 中通过 HTTPS 网址打开；本机审核可使用随包启动器。'));
  // The reader also registers the worker, but has no download controls.
  register.catch(e => message(e.message, true));
  function command(type, onProgress) {
    return register.then(r => new Promise((resolve,reject) => {
      const channel = new MessageChannel(); let timer;
      const close = () => {clearTimeout(timer); channel.port1.close();};
      const arm = () => { clearTimeout(timer);timer=setTimeout(()=>{close();reject(Error('暂时没有收到下载器回应，请保持页面打开，稍后重新检查状态。'));}, type === 'DOWNLOAD' ? 180000 : 45000); };
      channel.port1.onmessage = event => {
        const data = event.data; arm();
        if (data.type === 'progress') {if(onProgress)onProgress(data);return;}
        close(); data.type === 'error' ? reject(Error(data.message)) : resolve(data);
      };
      arm(); (r.active || navigator.serviceWorker.controller).postMessage({type},[channel.port2]);
    }));
  }
  if (!panel) return;
  function busy(value) {
    downloading = value; $('offlineDownload').disabled = value || !supported;
    $('offlineCheck').disabled = value || !supported;
    $('offlineCancel').hidden = !value;
  }
  function renderStatus(s) {
    readyVersion = s.ready ? s.version : '';
    $('offlineState').textContent = s.ready ? '完整课程已保存在此设备' : '尚未完成整套课程下载';
    $('offlineVersion').textContent = s.ready ? `${s.count} 个资源 · ${size(s.bytes)} · 版本 ${s.version.replace('sha256-','').slice(0,12)}` : '讲义、原始手绘图、公式字体及交互程序会一起下载。';
    $('offlineState').classList.toggle('is-ready',!!s.ready);
    $('offlineDownload').textContent = s.ready ? '重新下载 / 修复课程' : '下载完整课程';
    if (s.busy) message('课程正在下载，请保持下载页面打开。完成后可重新核验状态。');
  }
  async function status() { if(downloading || !supported)return;try {const s=await command('STATUS');renderStatus(s);return s;}catch(e){readyVersion='';$('offlineState').textContent='暂时无法确认本机课程是否完整';message(e.message,true);} }
  $('offlineCheck').onclick = async () => {
    busy(true); message('正在联网检查课程版本…');
    try {
      const result = await command('CHECK');latest = result.manifest;
      message(result.currentVersion === latest.version && readyVersion ? '本机课程与线上版本一致。' : `可下载完整课程：${latest.count} 个资源，${size(latest.bytes)}。点击下载后，完成校验才会替换本机版本。`);
      if (result.currentVersion !== latest.version) $('offlineDownload').textContent = readyVersion ? '下载课程更新' : '下载完整课程';
    } catch(e) {message('未能检查更新。已有完整离线课程可继续使用。' + e.message,true);}
    finally {busy(false);}
  };
  $('offlineDownload').onclick = async () => {
    busy(true); $('offlineProgress').hidden=false; $('offlineProgress').removeAttribute('value'); $('offlineProgressText').textContent='正在准备完整资源清单…';
    message('请保持此页面在前台，下载完成前不要锁屏或关闭。中断后可重新下载。');
    try {
      if (navigator.storage?.persist) { try {const persistent = await navigator.storage.persist(); $('offlineStorage').textContent = persistent ? '浏览器已允许持久保存；主动清理网站数据仍会删除下载内容与记录。' : '浏览器未保证永久保留；请定期备份学习记录，并在离线前确认课程状态。';}catch{$('offlineStorage').textContent='浏览器未允许持久保存申请，仍可尝试离线下载；请定期备份学习记录。';} }
      const result = await command('DOWNLOAD', p => {
        $('offlineProgress').max = p.total; $('offlineProgress').value = p.done;
        $('offlineProgressText').textContent = `已校验 ${p.done} / ${p.total} 个资源 · ${size(p.bytes)} / ${size(p.totalBytes)}`;
      });
      if(result.type === 'cancelled') {message('已停止本次下载。之前完整下载的课程仍可使用。');return;}
      renderStatus({...result,ready:true});
      $('offlineProgressText').textContent = `完成：${result.count} 个资源全部校验通过。`;
      $('offlineReload').hidden=false;
      message('课程已完整保存。请点击“重新打开课程”，再关闭网络检查讲义、作图和习题。');
    } catch(e) {message('本次下载未完成，已有完整版本不会被替换。' + e.message,true);}
    finally {busy(false);await status();}
  };
  $('offlineCancel').onclick = async () => { try {await command('CANCEL');message('已请求停止下载，请等待当前操作结束。');}catch(e){message(e.message,true);} };
  $('offlineReload').onclick = () => location.reload();
  $('offlineVerify').onclick = async () => {message('正在核验此设备中的全部课程资源…');const s=await status();if(s)message(s.ready?'本机资源完整。可关闭网络，从主屏幕图标重新打开后试读讲义。':'本机课程尚不完整，请联网重新下载。');};
  const network = () => {$('offlineNetwork').textContent = navigator.onLine ? '网络状态：设备报告已联网' : '网络状态：设备报告已断网';};
  window.addEventListener('online',network);window.addEventListener('offline',network);network();
  window.addEventListener('hashchange',()=>{if(location.hash==='#offline')status();});
  window.addEventListener('pageshow',()=>{if(location.hash==='#offline')status();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&location.hash==='#offline')status();});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('offlineInstall').hidden=false;});
  $('offlineInstall').onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('offlineInstall').hidden=true;};
  window.addEventListener('appinstalled',()=>{$('offlineInstall').hidden=true;message('已添加到设备。请从新图标打开，再检查完整课程下载状态。');});
  $('backupExport').onclick=()=>{
    try { const data={...window.GeometryBackup.read(localStorage),exportedAt:new Date().toISOString()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='解析几何_学习记录_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('backupStatus').textContent='已生成备份，请在浏览器下载或“文件”中确认保存。'; }
    catch(e){$('backupStatus').textContent='无法导出：'+e.message;}
  };
  $('backupFile').onchange=async e=>{
    const file=e.target.files[0];pendingBackup=null;$('backupRestore').hidden=true;if(!file)return;
    try {
      if(file.size>5*1024*1024)throw Error('备份超过 5 MB，请使用本课程导出的记录文件。');
      pendingBackup=window.GeometryBackup.validate(JSON.parse(await file.text()));
      const result=window.GeometryBackup.merge(window.GeometryBackup.read(localStorage),pendingBackup);
      $('backupStatus').textContent=`备份含 ${pendingBackup.topics.length} 个已读标记、${Object.keys(pendingBackup.records).length} 道习题记录。合并后同一位置已有文字优先保留（${result.conflicts} 处不同内容）；确认前可先导出本机备份。`;
      $('backupRestore').hidden=false;
    }catch(e){pendingBackup=null;$('backupStatus').textContent='未导入：'+e.message;}
  };
  $('backupRestore').onclick=()=>{
    if(!pendingBackup)return;
    try{window.GeometryBackup.restore(localStorage,pendingBackup);pendingBackup=null;location.reload();}
    catch(e){$('backupStatus').textContent=e.message;}
  };
  $('backupReload').onclick=()=>location.reload();
  if(!supported){busy(false);$('offlineVerify').disabled=true;$('offlineState').textContent='此浏览器暂不支持完整离线课程';}
  else status();
})();
