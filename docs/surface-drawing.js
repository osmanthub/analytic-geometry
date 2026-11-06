/* Source-linked drawing workshop. It is independent of the curated exercise bank. */
(() => {
  'use strict';
  const root=document.getElementById('surfaceDrawing');
  const problems=[...window.surfaceDrawingProblems,...window.surfaceIntersectionProblems];
  const paper={...window.paperBase,...window.paperCurves,...window.paperRegions};
  const groups={
    base:{title:'标准二次曲面',caption:'10 道原题 · 含柱面与退化情形',lead:'从标准方程读出轴向、中心或顶点，用主截线与平行截线建立整体形状。',route:['化为标准式','定位轴向与特征点','画主截线','补平行截线或母线','依真实遮挡整理终图']},
    curves:{title:'二次曲面交线',caption:'8 道原题 · 平面截线与曲面交线',lead:'同时满足两张曲面方程才是交线。先消元确定投影与范围，再恢复第三个坐标，区分平面曲线与空间曲线。',route:['辨认两张曲面','消元求投影','恢复高度与分支','标出特征点并连线','代回两个原方程']},
    regions:{title:'曲面围成的区域',caption:'8 道原题 · 含两道平面边界入门题',lead:'先说明取哪一侧、哪一卦限，再求投影、交线和实际边界片。最终画的是有界公共区域。',route:['把区域写成不等式','选投影或分层截面','求边界交线与顶点','裁出真实边界片','核对闭合与虚实线']}
  };
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function visibilityPanel(hand,expanded=false){
    const v=hand.visibility;if(!v)return '';
    return `<section class="paper-visibility"><p><b>本题观察方向：</b>${esc(v.view)}</p><div class="paper-line-legend" aria-label="纸笔图线型说明"><span><i class="line-visible"></i>可见轮廓／交线：实线</span><span><i class="line-hidden"></i>被遮挡部分：虚线</span><span><i class="line-guide"></i>坐标轴／定位线：浅色</span></div><details ${expanded?'open':''}><summary>怎样判断本题的前后遮挡？</summary><p>${esc(v.rule)}</p><ul>${v.examples.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details></section>`;
  }
  let group='base',selected=problems.find(p=>p.group===group).id,stage=0,paperStep=0;
  const params=new URLSearchParams(location.search),requested=problems.find(p=>p.id===params.get('drawing'));
  if(requested){selected=requested.id;group=requested.group;}
  root.innerHTML=`<div class="drawing-groups" aria-label="作图专题分类">${Object.entries(groups).map(([id,g],i)=>`<button data-draw-group="${id}" aria-pressed="${id===group}"><span>0${i+1}</span><strong>${g.title}</strong><small>${g.caption}</small></button>`).join('')}</div><div id="drawingGroupGuide"></div><div class="drawing-layout"><aside class="drawing-catalog"><details id="drawingCatalog" open><summary>选择原图题目 <span id="drawingCount"></span></summary><div id="drawingList"></div></details></aside><article id="drawingProblem" aria-live="polite"></article></div><details class="drawing-method"><summary>空间关系的作图要点：截线、投影、轮廓与遮挡</summary><div class="drawing-method-grid"><div><h3>先分清四种线</h3><p><b>截线</b>是曲面与指定平面的交线；<b>投影</b>是空间对象沿指定方向投到平面的点集；<b>边界交线</b>是两张边界片公共的线；<b>外轮廓</b>由视线方向决定。主截线通常不等于外轮廓，投影也不等于原交线。</p></div><div><h3>消元后还要恢复与检验</h3><p>消元所得平面方程先看作候选投影，结合原方程确定实点范围、正负分支及第三个坐标。平方前保留根式的非负条件；每个特征点必须代回全部原条件。</p></div><div><h3>实体区域先写不等式</h3><p>边界方程只说明“面在哪里”，还要用不等式说明取哪一侧。固定一个坐标，看截面是圆盘、矩形还是其他区域；把所有真实边界片拼合，再检查是否有遗漏或多画的面。</p></div><div><h3>虚实线由视线决定</h3><p>先固定坐标轴和观察位置，再逐段检查：从眼睛向纸面上的某点看去，先遇到的曲面在前，它会挡住同一视线上的后方曲线。可见外轮廓和交线画实线，被挡住的部分画虚线；经过轮廓或遮挡边界时再换线型。不能仅凭“纸面上半圈／下半圈”定前后；同一条交线也可能多次在实线、虚线之间转换。坐标轴与定位线是浅色参照。示意截断处不添加端盖。</p></div></div></details><details class="drawing-method"><summary>原始图片与讲义来源</summary><p>题号与方程分别核对三张用户原图。第一、第三部分对应现用第四章 §4.9 的 18 道作图题；第二部分依据原图的 8 道空间曲线题补写分析，现用讲义未完整收入这 8 题。本轮纸笔分步图参考三张原始手绘图重绘，属于网站教学示范；原始图片保留原貌，配套讲义按课程审核意见修订。网页新增分析仍与讲义原文分别注明。</p><div class="drawing-source-links"><a href="drawing-sources/base.jpg" target="_blank" rel="noopener">原图 1 · 曲面作图 ↗</a><a href="drawing-sources/curves.jpg" target="_blank" rel="noopener">原图 2 · 空间曲线作图 ↗</a><a href="drawing-sources/regions.jpg" target="_blank" rel="noopener">原图 3 · 空间区域作图 ↗</a><a href="reader.html?doc=surfaces&page=63" target="_blank" rel="noopener">第四章 §4.9 · PDF 第 63 页起 ↗</a></div><p class="fine">原图用于核对题面；示意线条不代替方程。涉及原图示意与标准方程不同的地方，按原方程与讲义校核说明判断。第四章 PDF 页码比该册印刷页码多 1。</p></details>`;
  // Reserve the full image box even inside closed details. Do not lazily load a negatively offset crop.
  function originalSketch(p,n){
    // Each source sketch has its own bounds: outlines, arrowheads and labels must fit inside.
    const meta={"base":{"w":3200,"h":2264,"boxes":[[0.025,0.197,0.2,0.37],[0.205,0.178,0.375,0.401],[0.421,0.178,0.57,0.44],[0.59,0.184,0.79,0.43],[0.823,0.164,0.96,0.431],[0.005,0.688,0.194,0.89],[0.218,0.654,0.385,0.925],[0.389,0.674,0.575,0.934],[0.609,0.674,0.752,0.922],[0.771,0.652,0.95,0.938]]},"curves":{"w":3264,"h":2224,"boxes":[[0.045,0.15,0.215,0.405],[0.27,0.13,0.45,0.405],[0.505,0.126,0.74,0.405],[0.775,0.185,0.955,0.43],[0.04,0.655,0.23,0.955],[0.28,0.6,0.5,0.95],[0.505,0.575,0.745,0.96],[0.75,0.65,0.965,0.91]]},"regions":{"w":3229,"h":2200,"boxes":[[0.04,0.175,0.235,0.45],[0.275,0.18,0.465,0.45],[0.455,0.145,0.74,0.46],[0.77,0.145,0.985,0.445],[0.05,0.6,0.21,0.945],[0.28,0.635,0.46,0.92],[0.545,0.635,0.73,0.92],[0.765,0.635,0.985,0.91]]}}[p.group];
    const [x,y,right,bottom]=meta.boxes[n-1],w=right-x,h=bottom-y;
    return `<details class="paper-source"><summary>对照原始手绘图 · 第 ${n} 题</summary><p class="fine">以下是您上传原图中的本题作图结果，保留原貌供核对。${p.id==='base-02'?'本题按原图采用 y 向上、x 向右、z 斜向左下的右手系构图；顶点在上、开口向下，实虚按该视向核对。':p.id==='base-06'?'本题按原图单独采用 x 向上、y 向右、z 斜向右上的右手系构图；实虚分段按相应视向核对。':'网站分步图统一采用右手坐标架及 y、z 纸面垂直的画法；临摹时以分步图的坐标方向为准，数值与边界按原方程校核。'}</p><div class="paper-original-crop" style="aspect-ratio:${meta.w*w}/${meta.h*h}"><img src="${p.source.image}" alt="原始手绘图第${n}题局部" width="${meta.w}" height="${meta.h}" style="width:${100/w}%;height:${100/h}%;left:${-100*x/w}%;top:${-100*y/h}%;" loading="eager"></div><a href="${p.source.image}" target="_blank" rel="noopener">打开完整原始图片 ↗</a></details>`;
  }
  function setLink(){const u=new URL(location.href);u.searchParams.set('drawing',selected);history.replaceState(null,'',u);}
  function chooseGroup(id){group=id;selected=problems.find(p=>p.group===id).id;stage=0;paperStep=0;setLink();render();}
  root.querySelectorAll('[data-draw-group]').forEach(b=>b.onclick=()=>chooseGroup(b.dataset.drawGroup));
  function render(){
    const g=groups[group],list=problems.filter(p=>p.group===group),p=problems.find(p=>p.id===selected);
    root.querySelectorAll('[data-draw-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.drawGroup===group)));
    document.getElementById('drawingGroupGuide').innerHTML=`<p class="drawing-lead">${g.lead}</p><ol class="drawing-route">${(p.id==='base-06'?['对照原图的马鞍外形','画上凹轮廓与两翼','补前后下边弧','后定右手坐标轴','按遮挡整理终图']:g.route).map(t=>`<li>${t}</li>`).join('')}</ol>`;
    document.getElementById('drawingCount').textContent=list.length+' 题';
    document.getElementById('drawingList').innerHTML=list.map(item=>`<button data-draw-problem="${item.id}" aria-current="${item.id===selected?'true':'false'}"><small>${item.number}</small><span>${esc(item.title)}</span></button>`).join('');
    root.querySelectorAll('[data-draw-problem]').forEach(b=>b.onclick=()=>{selected=b.dataset.drawProblem;stage=0;paperStep=0;setLink();render();if(matchMedia('(max-width:760px)').matches){document.getElementById('drawingCatalog').open=false;document.getElementById('drawingProblem').scrollIntoView({block:'start'});}});
    const page=p.source.lecturePage,hand=paper[p.id];
    const imageSrc=path=>p.id==='base-06'?path+'?v=hand-saddle-20261026':path;
    document.getElementById('drawingProblem').innerHTML=`<div class="drawing-problem-top"><span>${g.title} / ${p.number}</span><a href="${p.source.image}" target="_blank" rel="noopener">核对原图题面 ↗</a></div><h3>${esc(p.title)}</h3><div class="drawing-statement">${p.statement}</div><p class="drawing-origin">${esc(p.source.label)}${page?` · <a href="reader.html?doc=surfaces&page=${page}" target="_blank" rel="noopener">讲义 PDF 第 ${page}–${p.source.lectureEndPage} 页 ↗</a>`:' · 作图分析为本专题依据原题补写'}</p><nav class="drawing-stages" aria-label="本题作图阶段">${['题干与任务','空间分析','跟着落笔画','终图与核验'].map((t,i)=>`<button data-draw-stage="${i}" aria-current="${stage===i?'step':'false'}">${i+1}. ${t}</button>`).join('')}</nav><div id="drawingStageBody"></div><div class="drawing-stage-actions"><button id="drawPrevious" class="button outline" ${stage===0?'disabled':''}>← 上一步</button><span>阶段 ${stage+1} / 4</span><button id="drawNext" class="button primary">${stage===3?'重新分析 ↺':'下一步 →'}</button></div>`;
    root.querySelectorAll('[data-draw-stage]').forEach(b=>b.onclick=()=>{stage=Number(b.dataset.drawStage);render();});
    const sourceNo=Number(p.id.split('-')[1]);
    const sourceFigure=originalSketch(p,sourceNo);
    const figure=`<figure class="drawing-reference paper-final"><img src="${imageSrc(hand.stages[3].image)}" alt="${esc(p.number+' '+p.title+'，纸笔作图终图')}" loading="lazy"><figcaption>${hand.sourceNote}</figcaption></figure>`;
    let body='';
    if(stage===0)body=`<div class="drawing-start"><h4>纸上要画到什么程度？</h4><p>${hand.goal}</p><p>${hand.layout}</p></div><div class="paper-prep"><h4>准备落笔</h4>${hand.preparation?hand.preparation.map(t=>`<p>${t}</p>`).join(''):`<p>统一采用右手直角坐标系：\\(\\V e_x\\times\\V e_y=\\V e_z\\)。纸上先画水平向右的 \\(y\\) 轴、竖直向上的 \\(z\\) 轴，两轴成直角，再画斜向左下的 \\(x\\) 轴。这里采用斜投影，空间的三个轴仍两两垂直，纸面长度和其余夹角不用于量取空间真值。</p><p>用铅笔轻画坐标架和定位线，确定关键点后再加重所求曲线或真实边界。圆在斜视简图中用椭圆弧表示；不需要阴影、渐变、密集网格，也不按纸面长度量取空间真值。</p>`}<p>轴名放在箭头外侧，点名写在相邻空白处，与线条留出间距；拥挤时用短引线指出所标的点。真实的轴线交点应保留，不用挪动点或曲线来给字母让位。</p><p>进入“跟着落笔画”，每完成一步再看下一幅。最后只核对本题必须留下的点、线和空间关系。</p></div>${sourceFigure}`;
    if(stage===1)body=p.sections.filter(s=>!s.title.includes('虚实线')&&!s.title.includes('作图要点')).map(s=>`<section class="drawing-analysis"><h4>${s.title}</h4>${s.body}</section>`).join('');
    if(stage===2){
      const item=hand.stages[paperStep];
      body=`<div class="paper-setup"><strong>${p.id==='base-06'?'先画鞍形，第三步再补轴':'坐标架怎么摆'}</strong><p>${hand.layout}</p></div><div class="paper-workspace"><nav class="paper-step-list" aria-label="纸笔落笔顺序">${hand.stages.map((s,i)=>`<button data-paper-step="${i}" aria-current="${paperStep===i?'step':'false'}"><span>${i+1}</span><strong>${esc(s.title)}</strong></button>`).join('')}</nav><figure class="drawing-reference paper-progress"><img src="${imageSrc(item.image)}" alt="${esc(p.number+' 第'+(paperStep+1)+'步：'+item.title)}"><figcaption>第 ${paperStep+1} / 4 步 · ${esc(item.title)} · ${hand.stageCaptions?hand.stageCaptions[paperStep]:(paperStep===0?'从坐标架开始':'与上一幅使用同一坐标架')}</figcaption></figure><div class="paper-instruction"><h4>这一步怎么画</h4><p>${item.action}</p><p class="paper-why"><b>依据：</b>${item.why}</p></div></div><div class="paper-step-actions"><button id="paperBack" ${paperStep===0?'disabled':''}>← 看上一笔</button><button id="paperForward" ${paperStep===3?'disabled':''}>画好了，看下一笔 →</button></div><p class="fine">先用细浅线定位，再按本题观察方向整理：看得到的轮廓和交线重描实线，前面有曲面挡住的部分改为虚线。辅助线与表示遮挡的虚线用途不同；终图擦去不再需要的定位线。</p>${sourceFigure}`;
    }
    if(stage===3)body=`<h4>纸笔示范终图</h4>${figure}<div class="paper-requirements"><section><h4>终图必须留下</h4><ul>${hand.keep.map(t=>`<li>${t}</li>`).join('')}</ul></section><section><h4>可以擦去／不要误画</h4><ul>${hand.omit.map(t=>`<li>${t}</li>`).join('')}</ul></section></div>${sourceFigure}<details class="drawing-figure-toggle"><summary>用方程进一步核验</summary><div class="drawing-checks">${p.checks.map(t=>`<div>${t}</div>`).join('')}</div></details><p class="fine">收起参考图后独立重画：只要关键点、分支、开口方向、边界连接和虚实分段正确，就不必追求电脑图的精确投影或光滑度。</p>`;
    if(stage>0)body=visibilityPanel(hand,stage===1)+body;
    document.getElementById('drawingStageBody').innerHTML=body;
    root.querySelectorAll('[data-paper-step]').forEach(b=>b.onclick=()=>{paperStep=Number(b.dataset.paperStep);render();});
    if(stage===2){document.getElementById('paperBack').onclick=()=>{if(paperStep>0){paperStep--;render();}};document.getElementById('paperForward').onclick=()=>{if(paperStep<3){paperStep++;render();}};}
    document.getElementById('drawPrevious').onclick=()=>{if(stage>0)stage--;render();};
    document.getElementById('drawNext').onclick=()=>{stage=(stage+1)%4;render();};
    typeset(root);
  }
  if(matchMedia('(max-width:760px)').matches)document.getElementById('drawingCatalog').open=false;
  render();
})();
