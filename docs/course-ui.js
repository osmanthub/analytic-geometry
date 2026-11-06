'use strict';
(() => {
  const $=s=>document.querySelector(s), data=window.courseData, problems=[...window.curatedExercises].sort((a,b)=>({challenge:0,advanced:1,consolidation:2}[a.tier]-{challenge:0,advanced:1,consolidation:2}[b.tier])||data.parts.findIndex(p=>p.id===a.part)-data.parts.findIndex(p=>p.id===b.part)||a.number.localeCompare(b.number,'zh-CN',{numeric:true}));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tierName=p=>window.exerciseTierLabels[p.tier], sourceName=p=>window.exerciseSourceLabels[p.sourceKind];
  const partName=id=>data.parts.find(p=>p.id===id)?.title||id;
  const questionTitle=p=>p.part==='conics'?'二次曲线的化简与作图 · '+p.number:p.title;
  const pdfLink=t=>`reader.html?doc=${encodeURIComponent(t.doc)}&page=${t.page}`;
  const pageLabel=t=>`分册PDF第 ${t.page}${t.endPage&&t.endPage!==t.page?'–'+t.endPage:''} 页`;
  let topicPart='vectors',currentTopic=0,seen=new Set();
  try { const s=JSON.parse(localStorage.getItem('geometry-topics-v3')||'[]');if(Array.isArray(s))seen=new Set(s.filter(id=>data.topics.some(t=>t.id===id))); } catch {}
  $('#courseLibrary').innerHTML=data.parts.map((p,i)=>`<a class="library-card" href="reader.html?doc=${p.doc}&page=1"><span>PART ${String(i+1).padStart(2,'0')} · ${esc(p.chapter)}</span><h3>${esc(p.title)}</h3><p>${esc(p.version)}<br>${p.pages}页 · ${data.topics.filter(t=>t.part===p.id).length}个知识点</p><b>阅读本部分讲义 ↗</b></a>`).join('');
  $('#courseParts').innerHTML=`<button data-part="all" aria-pressed="false">全部知识点</button>`+data.parts.map(p=>`<button data-part="${p.id}" aria-pressed="${p.id===topicPart}">${esc(p.title)}</button>`).join('');
  function renderTopics(){
    const query=$('#topicSearch').value.trim().toLowerCase();
    const matches=data.topics.filter(t=>(topicPart==='all'||t.part===topicPart)&&[t.title,t.concept,t.difficulty,t.section].join(' ').toLowerCase().includes(query));
    $('#chapters').innerHTML=matches.map(t=>`<button class="knowledge-card ${seen.has(t.id)?'read':''}" data-topic="${t.id}"><div class="knowledge-top"><span>${esc(t.section)}</span><span>${seen.has(t.id)?'✓ 已阅读':'知识点'}</span></div><h3>${esc(t.title)}</h3><p>${t.goal||t.concept}</p><div class="difficulty-note"><b>难点</b><span>${t.difficulty}</span></div><div class="knowledge-foot"><span>${pageLabel(t)}</span><b>展开导读 ↗</b></div></button>`).join('')||'<p class="empty-state">没有匹配的知识点，请更换关键词或课程部分。</p>';
    const p=data.parts.find(p=>p.id===topicPart);
    $('#coursePartIntro').innerHTML=p?`<p class="course-part-heading">${esc(p.chapter)} · ${esc(p.title)} <a href="reader.html?doc=${p.doc}&page=1">打开整册 →</a></p>`:'';
    $('#topicCount').textContent=`${matches.length} 个知识点`;
    $('#progressText').textContent=`已阅读 ${seen.size} / ${data.topics.length} 个知识点`;
    $('#progressBar').style.width=seen.size/data.topics.length*100+'%';
    $('#chapters').querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>openTopic(data.topics.findIndex(t=>t.id===b.dataset.topic)));
    typeset($('#chapters'));
  }
  function openTopic(i){
    currentTopic=i;const t=data.topics[i];
    $('#lessonIndex').textContent=partName(t.part)+' · '+t.section;
    $('#lessonBody').innerHTML=`<h2>${esc(t.title)}</h2><p class="topic-goal">学习目标：${t.goal||''}</p><h3>先理解这个知识点</h3><p>${t.concept}</p>${t.formula?`<div class="formula-box">${mathHTML(t.formula,true)}</div>`:''}<h3>先备知识</h3><p>${(t.prerequisites||[]).join('；')}</p><div class="difficulty-note"><b>重点突破</b><span>${t.difficulty}</span></div><h3>带着问题读讲义</h3><ol>${(t.steps||[]).map(s=>`<li>${s}</li>`).join('')}</ol><div class="topic-actions"><a class="button primary" href="${pdfLink(t)}">阅读详细讲义原页 ↗</a>${t.lab?`<button class="button outline" id="topicExperiment">打开对应实验</button>`:''}<button class="button outline" id="topicExercises">练习本部分精选题 →</button></div><div class="lesson-source">${esc(partName(t.part))} · ${pageLabel(t)}${t.sourceDoc==='upper'||['vectors','lines'].includes(t.part)?` · 上半原册PDF第 ${t.sourcePage}${t.sourceEndPage&&t.sourceEndPage!==t.sourcePage?'–'+t.sourceEndPage:''} 页`:''}<p>本页导读和思考问题为教学重组；点击上方链接查看完整定义、推导、例题与原图。</p></div>`;
    typeset($('#lessonBody'));$('#markRead').textContent=seen.has(t.id)?'已阅读 ✓':'标记为已阅读 ✓';
    $('#nextLesson').textContent=i===data.topics.length-1?'回到第一个知识点 ↺':'下一知识点 →';
    if(!$('#lessonDialog').open)$('#lessonDialog').showModal();$('#lessonDialog').scrollTop=0;
    $('#topicExercises').onclick=()=>{$('#lessonDialog').close();$('#exercisePart').value=t.part;$('#exerciseLevel').value='selected';$('#exerciseSource').value='all';$('#exerciseSearch').value='';renderProblemList(true);location.hash='exercises';};
    if(t.lab)$('#topicExperiment').onclick=()=>{$('#lessonDialog').close();const tab=document.querySelector(`[data-mode="${t.lab}"]`);if(tab)tab.click();location.hash=t.lab==='section'?'section':'lab';};
  }
  $('#closeLesson').onclick=()=>$('#lessonDialog').close();
  $('#markRead').onclick=()=>{seen.add(data.topics[currentTopic].id);let saved=true;try{localStorage.setItem('geometry-topics-v3',JSON.stringify([...seen]));}catch{saved=false;}renderTopics();$('#markRead').textContent=saved?'已阅读 ✓':'已阅读（仅本次会话） ✓';};
  $('#nextLesson').onclick=()=>openTopic((currentTopic+1)%data.topics.length);
  $('#courseParts').querySelectorAll('button').forEach(b=>b.onclick=()=>{topicPart=b.dataset.part;$('#courseParts').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderTopics();});
  $('#topicSearch').oninput=renderTopics;renderTopics();

  let records={};try{const r=JSON.parse(localStorage.getItem('geometry-worked-v1')||'{}');if(r&&typeof r==='object'&&!Array.isArray(r))records=r;}catch{}
  let selected=problems[0]?.id,stage=-1,revealed=false;
  const active=()=>problems.find(p=>p.id===selected);
  const record=()=>{const r=records[selected];if(!r||typeof r!=='object'||Array.isArray(r))records[selected]={notes:[],reflection:'',viewed:false};if(!Array.isArray(records[selected].notes))records[selected].notes=[];return records[selected];};
  function save(){let ok=true;try{let latest={};try{latest=JSON.parse(localStorage.getItem('geometry-worked-v1')||'{}');if(!latest||typeof latest!=='object'||Array.isArray(latest))latest={};}catch{}latest[selected]=records[selected];localStorage.setItem('geometry-worked-v1',JSON.stringify(latest));records=latest;}catch{ok=false;}const msg=$('#noteStatus');if(msg)msg.textContent=ok?'思考记录已保存在此浏览器':'暂时无法保存；可导出当前记录';return ok;}
  function filtered(){const part=$('#exercisePart').value,level=$('#exerciseLevel').value,source=$('#exerciseSource').value,q=$('#exerciseSearch').value.trim().toLowerCase();return problems.filter(p=>(part==='all'||p.part===part||p.relatedParts?.includes(part))&&(level==='all'||level==='selected'&&p.tier!=='consolidation'||p.tier===level)&&(source==='all'||p.sourceKind===source)&&[p.title,p.number,p.source.label,...p.tags].join(' ').toLowerCase().includes(q));}
  function renderProblemList(reset=false){
    const list=filtered();if(reset||!list.some(p=>p.id===selected)){selected=list[0]?.id;stage=-1;revealed=false;}
    $('#exerciseCount').textContent=`${list.length} / ${problems.length} 题`;
    const selectedCount=problems.filter(p=>p.tier!=='consolidation').length;
    $('#exerciseSelectionNote').textContent=$('#exerciseLevel').value==='selected'?'难题精选以证明、充要性、参数分类为标准。跨章题可同时从线面与曲面部分找到；同一题只计一次。':'巩固练习保留原题及学习记录；竞赛原题单独标明来源，不能据此推定难度。';
    $('#exerciseTotal').textContent=`${selectedCount} 道难题精选 · ${problems.length} 道总题库`;
    $('#exerciseList').innerHTML=list.map(p=>`<button class="problem-link" data-problem="${p.id}" aria-current="${p.id===selected?'true':'false'}"><span class="problem-number">${esc(p.number)} <i>${esc(tierName(p))}</i></span><strong>${esc(questionTitle(p))}</strong><small>${esc(sourceName(p))} · ${esc(partName(p.part))}${p.relatedParts?.length?' · 跨章':''}${records[p.id]?.notes?.some(s=>typeof s==='string'&&s.trim())?' · 有思考记录':''}</small></button>`).join('')||'<p class="empty-state">当前条件下暂无题目，可切换难度层次或来源。</p>';
    $('#exerciseList').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.problem;stage=-1;revealed=false;renderProblemList();if(window.matchMedia('(max-width:700px)').matches){$('#exerciseCatalogDetails').open=false;$('#exerciseWorkspace').scrollIntoView({block:'start'});}});
    renderProblem();
  }
  function renderProblem(){
    const p=active();if(!p){$('#exerciseWorkspace').innerHTML='<p class="empty-state">当前条件下暂无精选题。可切换到“巩固练习”查看现有训练题；常规化简题不再充作高难题。</p>';return;}
    const r=record();
    $('#exerciseWorkspace').innerHTML=`<div class="problem-heading"><div class="eyebrow">${esc(tierName(p))} · ${esc(sourceName(p))} · ${esc(p.number)}</div><span class="problem-part">${esc(partName(p.part))}</span></div><h3 class="problem-title">${esc(questionTitle(p))}</h3><div class="problem-tags">${(p.part==='conics'?['坐标变换','标准方程','几何判别']:p.tags).map(t=>`<span>${esc(t)}</span>`).join('')}</div><p class="problem-demand"><strong>训练要求：</strong>${esc(p.challengeReason)}</p><div class="problem-statement">${p.statement}</div><p class="problem-source">出处：${esc(p.source.label)}。${p.source.questionUrl?`<br><a class="text-link" href="${esc(p.source.questionUrl)}" target="_blank" rel="noopener">查看原题依据页（可能含答案） ↗</a>`:''}${p.source.questionDoc?`<br><a class="text-link" href="reader.html?doc=${p.source.questionDoc}&page=${p.source.questionPage}" target="_blank" rel="noopener">查看当前讲义的原题页 ↗</a>`:''}</p>${p.corrections?'<p class="fine">本题附有网页校核说明，随完整解答一同展开。</p>':''}<div class="thinking-route" aria-label="解题阶段"><span class="${stage===-1?'current':'done'}">题干</span>${p.stages.map((s,i)=>`<span class="${stage===i?'current':stage>i?'done':''}">${i+1}. ${esc(s.title)}</span>`).join('')}<span class="${revealed?'current':''}">完整解答</span></div><div id="thinkingArea"></div><div id="standardAnswer"></div>`;
    renderStage();typeset($('#exerciseWorkspace'));
  }
  function renderStage(){
    const p=active(),r=record(),area=$('#thinkingArea');
    if(stage<0){area.innerHTML=`<div class="start-thinking"><p>先画图或写出已知条件，明确要证明或求出的对象。下面的步骤将帮助你组织自己的分析与计算。</p><button class="button primary" id="beginThinking">开始分析 →</button>${r.notes.some(s=>typeof s==='string'&&s.trim())?'<p class="fine">这道题已有本机思考记录，进入各阶段可继续编辑；答案仍保持收起。</p>':''}</div>`;$('#beginThinking').onclick=()=>{stage=0;revealed=false;renderProblem();$('#thinkingArea').scrollIntoView({block:'nearest'});};return;}
    const s=p.stages[stage];
    area.innerHTML=`<div class="thinking-step"><div class="step-heading"><span>步骤 ${stage+1} / ${p.stages.length}</span><h4>${esc(s.title)}</h4></div><div class="thinking-prompt">${s.prompt}</div><label for="thinkingNote">我的分析与计算</label><textarea id="thinkingNote" rows="5" placeholder="写出已知与待求、选用的关系式、计算过程及理由。可用普通文字或 LaTeX 记号。"></textarea><div class="note-tools"><span id="noteStatus">记录只保存在此浏览器</span><button id="exportThinking">导出本题记录 ↓</button></div><details class="hint"><summary>需要一点提示</summary><div>${s.hint}</div></details><details class="checkpoint"><summary>检查这一阶段的关键步骤</summary><div>${s.checkpoint}</div></details><div class="thinking-actions"><button class="button outline" id="previousStage">${stage===0?'回到题干':'← 上一步'}</button>${stage<p.stages.length-1?'<button class="button primary" id="nextStage">进入下一阶段 →</button>':'<button class="button primary" id="revealAnswer">查看完整标准答案 ↓</button>'}</div></div>`;
    $('#thinkingNote').value=typeof r.notes[stage]==='string'?r.notes[stage]:'';
    $('#thinkingNote').oninput=e=>{record().notes[stage]=e.target.value;save();};
    $('#exportThinking').onclick=exportNotes;
    $('#previousStage').onclick=()=>{stage--;revealed=false;renderProblem();};
    if(stage<p.stages.length-1)$('#nextStage').onclick=()=>{stage++;revealed=false;renderProblem();$('#thinkingArea').scrollIntoView({block:'nearest'});};
    else $('#revealAnswer').onclick=()=>{revealed=!revealed;if(revealed){record().viewed=true;save();}renderAnswer();};
    renderAnswer();
  }
  function renderAnswer(){
    const p=active(),r=record(),answer=$('#standardAnswer');
    if(!revealed){answer.replaceChildren();if($('#revealAnswer'))$('#revealAnswer').textContent='查看完整标准答案 ↓';return;}
    $('#revealAnswer').textContent='收起标准答案 ↑';
    const source=p.source.url||(p.source.doc?`reader.html?doc=${encodeURIComponent(p.source.doc)}&page=${p.source.page||1}`:'');
    answer.innerHTML=`<section class="standard-answer"><div class="answer-title"><span class="eyebrow">STANDARD SOLUTION</span><h4>完整标准答案</h4></div>${p.corrections?`<div class="source-correction"><strong>网页校核说明</strong><p>${Array.isArray(p.corrections)?p.corrections.join('<br>'):p.corrections}</p></div>`:''}<p class="answer-focus">本题关键：${esc(p.title)}</p><div class="solution-content">${p.solution}</div><h4>解题逻辑链</h4><ol class="logic-chain">${p.chain.map(s=>`<li>${s}</li>`).join('')}</ol>${p.pitfalls?.length?`<div class="pitfalls"><h4>回看易错点</h4><ul>${p.pitfalls.map(s=>`<li>${s}</li>`).join('')}</ul></div>`:''}${p.source.evidence?`<details class="source-note-detail"><summary>来源与网页校核说明</summary><p>${esc(p.source.evidence).replace('x−z+4=0',String.raw`\(x-z+4=0\)`)}</p></details>`:''}${source?`<a class="text-link" href="${esc(source)}" target="_blank" rel="noopener">核对原题／原解所在页 ↗</a>`:''}<div class="reflection"><label for="solutionReflection">对照答案后，我需要补上的理由或改正的步骤</label><textarea id="solutionReflection" rows="3" placeholder="区分思路选择、计算错误与漏掉的条件。"></textarea><button class="button outline" id="exportAnswerNotes">导出我的完整记录 ↓</button></div><p class="fine">查看标准答案不代表已经独立掌握。可收起答案，在纸上重新完成证明或计算。</p></section>`;
    $('#solutionReflection').value=typeof r.reflection==='string'?r.reflection:'';
    $('#solutionReflection').oninput=e=>{record().reflection=e.target.value;save();};$('#exportAnswerNotes').onclick=exportNotes;
    typeset(answer);
  }
  function exportNotes(){
    const p=active(),r=record(),lines=[`${p.number} ${questionTitle(p)}`,partName(p.part),`出处：${p.source.label}`,'',...p.stages.flatMap((s,i)=>[`${i+1}. ${s.title}`,String(r.notes[i]||'（尚未记录）'),'']),'对照解答后的反思',String(r.reflection||'（尚未记录）')];
    const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`解析几何_思考记录_${p.id}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  for(const id of ['exercisePart','exerciseLevel','exerciseSource'])$('#'+id).onchange=()=>renderProblemList(true);
  $('#exerciseSearch').oninput=()=>renderProblemList(true);
  if(window.matchMedia('(max-width:700px)').matches)$('#exerciseCatalogDetails').open=false;
  const initial=new URLSearchParams(location.search);for(const [param,id] of [['part','exercisePart'],['level','exerciseLevel'],['source','exerciseSource']]){const val=initial.get(param);if(val&&[...$('#'+id).options].some(o=>o.value===val))$('#'+id).value=val;}
  renderProblemList();
})();
