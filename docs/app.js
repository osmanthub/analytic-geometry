'use strict';
const $=s=>document.querySelector(s);
let qi=0;
function renderQuiz(){const q=quizzes[qi];$('#quizCount').innerHTML=`${String(qi+1).padStart(2,'0')} <span>/ ${String(quizzes.length).padStart(2,'0')}</span>`;$('#quizTopic').textContent=q.topic;$('#question').textContent=q.q;typeset($('#question'));$('#feedback').textContent='';$('#options').innerHTML=q.options.map((o,i)=>`<button class="option" data-answer="${i}"><span>${'ABCD'[i]}</span>${o}</button>`).join('');typeset($('#options'));document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{const ok=+b.dataset.answer===q.a;document.querySelectorAll('[data-answer]').forEach(el=>{el.disabled=true;if(+el.dataset.answer===q.a)el.classList.add('correct')});if(!ok)b.classList.add('wrong');$('#feedback').textContent=(ok?'回答正确。':'再核对一下：正确答案是 '+ 'ABCD'[q.a]+'。')+q.why;typeset($('#feedback'));});}$('#nextQuiz').onclick=()=>{qi=(qi+1)%quizzes.length;renderQuiz()};renderQuiz();
let mode='surface',shape='ellipsoid',a=2.6,b=1.8,c=2,theta=60,slope=.5,slopeY=.3,intercept=0,uLength=2,vLength=2,yaw=35*Math.PI/180,pitch=22*Math.PI/180,zoom=1,cameraStyle='paper';
const slider=(id,label,min,max,step,val)=>`<div class="control-row"><label id="${id}Label" for="${id}">${label}<output id="${id}Val">${val}</output></label><div class="range-pair"><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"><input class="number-input" id="${id}Number" data-range="${id}" type="number" aria-labelledby="${id}Label" min="${min}" max="${max}" step="${step}" value="${val}"></div></div>`;
function renderControls(){
labModeSetup();if(mode==='section'){renderSectionControls();return;}if(['surface','cylinder','cone','revolution','coordinates'].includes(mode)){renderExtendedControls();return;}
if(mode==='vector'){
$('#controls').innerHTML=String.raw`<h3>长度、夹角与数量积</h3><p>取 \(\V u=\{u,0,0\}\)，\(\V v=\{v\cos\theta,v\sin\theta,0\}\)。其中 \(u,v>0\) 分别是两向量的模。</p>${slider('uLength',String.raw`向量的模 \(u\)`,.5,3,.1,uLength)}${slider('vLength',String.raw`向量的模 \(v\)`,.5,3,.1,vLength)}${slider('theta',String.raw`夹角 \(\theta\)（度）`,0,180,1,theta)}<div class="formula-box" id="liveFormula"></div><div class="observe"><strong>怎样观察</strong><p>固定夹角改变长度，数量积怎样改变？固定长度使夹角经过 \(90^\circ\)，数量积为何变号？棕色为 \(\V u\)，绿色为 \(\V v\)，虚线为正射影。</p></div>`;
for(const id of ['uLength','vLength','theta'])$('#'+id).oninput=e=>{if(id==='uLength')uLength=+e.target.value;else if(id==='vLength')vLength=+e.target.value;else theta=+e.target.value;$('#'+id+'Val').textContent=e.target.value;updateFormula();drawLab();};
}else{
$('#controls').innerHTML=String.raw`<h3>平面的方向与位置</h3><p>平面 \(z=kx+my+d\)；直线 \(x=1,\ y=0,\ z=t\)，\(t\in\mathbb R\)。分别调整两个斜率和截距。</p>${slider('slope',String.raw`沿 \(x\) 方向的斜率 \(k\)`,-1.5,1.5,.1,slope)}${slider('slopeY',String.raw`沿 \(y\) 方向的斜率 \(m\)`,-1.5,1.5,.1,slopeY)}${slider('intercept',String.raw`竖直截距 \(d\)`,-2,2,.1,intercept)}<div class="formula-box" id="liveFormula"></div><div class="observe"><strong>为什么总有唯一交点？</strong><p>\(\V n=\{-k,-m,1\}\)，直线方向 \(\V v=\{0,0,1\}\)，所以 \(\V n\cdot\V v=1\ne0\)。交点 \(P(1,0,k+d)\) 与 \(m\) 无关，因为直线上恒有 \(y=0\)。</p></div>`;
for(const id of ['slope','slopeY','intercept'])$('#'+id).oninput=e=>{if(id==='slope')slope=+e.target.value;else if(id==='slopeY')slopeY=+e.target.value;else intercept=+e.target.value;$('#'+id+'Val').textContent=e.target.value;updateFormula();drawLab();};
}updateFormula();typeset($('#controls'));
}
function updateFormula(){
if(mode==='vector')$('#liveFormula').innerHTML=mathHTML(String.raw`\begin{gathered}\V u\cdot\V v=uv\cos\theta\\=${(uLength*vLength).toFixed(2)}\cos${theta}^\circ\\\approx${(uLength*vLength*Math.cos(theta*Math.PI/180)).toFixed(3)}\end{gathered}`,true);
else if(mode==='plane')$('#liveFormula').innerHTML=mathHTML(String.raw`\begin{gathered}z=(${slope.toFixed(1)})x+(${slopeY.toFixed(1)})y+(${intercept.toFixed(1)})\\P(1,0,${(slope+intercept).toFixed(1)})\end{gathered}`,true);
}
document.querySelectorAll('[data-mode]').forEach(btn=>btn.onclick=()=>{mode=btn.dataset.mode;document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-selected',String(el===btn)));renderControls();drawLab()});
function prepare(canvas){const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);return{ctx,w:box.width,h:box.height};}
function scene(canvas,angle,tilt,scaleFactor,viewStyle=cameraStyle){
 const {ctx,w,h}=prepare(canvas),scale=Math.min(w,h)*scaleFactor,frame=GeometryView.frame(angle,tilt,viewStyle);
 const project=p=>{const q=frame.project(p);return[w/2+q[0]*scale,h/2+q[1]*scale]};
 const line=(pts,color='#5a8c73',width=1)=>{ctx.beginPath();pts.forEach((p,i)=>{const q=project(p);if(i===0)ctx.moveTo(...q);else ctx.lineTo(...q)});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()};
 canvas.parentElement.querySelectorAll('.plot-label').forEach(el=>el.remove());
 const label=(p,t,color='#778770',offset=[0,0])=>{const q=project(p),el=document.createElement('span');el.className='plot-label';el.style.left=q[0]+offset[0]+'px';el.style.top=q[1]+offset[1]+'px';el.style.color=color;el.innerHTML=mathHTML(t);canvas.parentElement.appendChild(el)};
 const dot=(p,color)=>{const q=project(p);ctx.beginPath();ctx.arc(...q,4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()};
 return{ctx,w,h,project,line,label,dot,frame};
}
function axes(s,length=3.5){
 const origin=s.project([0,0,0]);
 for(let i=0;i<3;i++){
  const p=[0,0,0],q=[0,0,0];q[i]=length;
  const raw=s.project(q),screenLength=Math.hypot(raw[0]-origin[0],raw[1]-origin[1]);
  if(screenLength<1e-8)continue;
  q[i]*=Math.min(s.w,s.h)*.40/screenLength;p[i]=-q[i];
  const color=['#b56b46','#398c7b','#6373b2'][i];s.line([p,q],color+'80',.8);
  const tip=s.project(q),dx=tip[0]-origin[0],dy=tip[1]-origin[1],len=Math.hypot(dx,dy);
  if(len>5){const ux=dx/len,uy=dy/len;s.ctx.beginPath();s.ctx.moveTo(tip[0]-7*ux+3*uy,tip[1]-7*uy-3*ux);s.ctx.lineTo(...tip);s.ctx.lineTo(tip[0]-7*ux-3*uy,tip[1]-7*uy+3*ux);s.ctx.strokeStyle=color;s.ctx.lineWidth=1.2;s.ctx.stroke();s.label(q,['x','y','z'][i],color,[14*ux,14*uy]);}
 }
 s.label([0,0,0],'O','#778770',[5,13]);
}
function mesh(s,type,aa,bb,cc){drawPatches(s,Geometry.patches(type,aa,bb,cc));}
function drawHero(){const s=scene($('#heroCanvas'),.65,.4,.105,'paper');axes(s,3.3);mesh(s,'ellipsoid',2.7,1.8,2.15);s.dot([2.7,0,0],'#b78b57');s.label([2.7,0,0],'a');}
function drawLab(){if(mode==='section'){drawSectionLab();return;}if(['surface','cylinder','cone','revolution','coordinates'].includes(mode)){drawExtendedLab();return;}const s=scene($('#labCanvas'),yaw,pitch,zoom*(mode==='plane'?.055:.104));axes(s,3.5);if(mode==='surface'){mesh(s,shape,a,b,shape==='hyperboloid'?2:c);return}if(mode==='vector'){const r=theta*Math.PI/180,u=[uLength,0,0],v=[vLength*Math.cos(r),vLength*Math.sin(r),0];s.line([[0,0,0],u],'#b56b46',3);s.line([[0,0,0],v],'#27735b',3);s.dot(u,'#b56b46');s.dot(v,'#27735b');s.label(u,String.raw`\V u`,'#b56b46');s.label(v,String.raw`\V v`,'#27735b');s.ctx.setLineDash([4,4]);s.line([v,[v[0],0,0]],'#8f9b7f');s.ctx.setLineDash([]);s.line(Array.from({length:40},(_,i)=>[.65*Math.cos(r*i/39),.65*Math.sin(r*i/39),0]),'#c29a59',1.5);s.label([.8*Math.cos(r/2),.8*Math.sin(r/2),0],theta+String.raw`^\circ`,'#aa8142');}else{const planeZ=(x,y)=>slope*x+slopeY*y+intercept;const corners=[[-2,-2,planeZ(-2,-2)],[2,-2,planeZ(2,-2)],[2,2,planeZ(2,2)],[-2,2,planeZ(-2,2)]];s.ctx.beginPath();corners.forEach((p,i)=>{const q=s.project(p);i?s.ctx.lineTo(...q):s.ctx.moveTo(...q)});s.ctx.closePath();s.ctx.fillStyle='#a2ba8a35';s.ctx.fill();for(let k=-2;k<=2;k+=.4){s.line([[k,-2,planeZ(k,-2)],[k,2,planeZ(k,2)]],'#77946e75',.8);s.line([[-2,k,planeZ(-2,k)],[2,k,planeZ(2,k)]],'#77946e75',.8)}s.line([[1,0,-4],[1,0,4]],'#b17d54',2);s.dot([1,0,slope+intercept],'#ad673f');s.label([1,0,slope+intercept],`P (1,0,${(slope+intercept).toFixed(1)})`,'#945c36');}}
function syncCamera(){const standard=cameraStyle==='paper';$('#paperView').setAttribute('aria-pressed',String(standard));$('#cameraNote').textContent=standard?'纸笔视角：y 轴水平，z 轴竖直，x 轴斜向左下；调整转角或拖动切换为自由观察。':'自由观察：空间坐标仍为右手系；投影后的 y、z 轴夹角随视角变化。点击“纸笔视角”恢复垂直画法。';const deg=((yaw*180/Math.PI+180)%360+360)%360-180;$('#view').value=deg;$('#viewVal').textContent=Math.round(deg)+'°';$('#pitch').value=pitch*180/Math.PI;$('#pitchVal').textContent=Math.round(pitch*180/Math.PI)+'°';$('#zoom').value=zoom;$('#zoomVal').textContent=zoom.toFixed(2)+'×';for(const [id,value] of [['view',Math.round(deg)],['pitch',Math.round(pitch*180/Math.PI)],['zoom',zoom]]){const num=$('#'+id+'Number');if(document.activeElement!==num)num.value=value;}}
// A new finger or a released finger starts a fresh gesture at the current view.
function installLabTouchControls(canvas){
 const pointers=new Map();let pinch=null;
 const distance=()=>{const [p,q]=[...pointers.values()];return Math.hypot(q.x-p.x,q.y-p.y)};
 const rebase=()=>{pinch=pointers.size===2?{distance:distance(),zoom}:null};
 const finish=e=>{if(!pointers.delete(e.pointerId))return;rebase();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)};
 const clear=()=>{const ids=[...pointers.keys()];pointers.clear();pinch=null;for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id)};
 canvas.addEventListener('pointerdown',e=>{
  if(mode==='coordinates'||(e.pointerType==='mouse'&&e.button!==0)||pointers.size>=2)return;
  e.preventDefault();
  const focused=document.activeElement;if(focused&&focused.matches('.view-control input'))focused.blur();
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);rebase();
 });
 canvas.addEventListener('pointermove',e=>{
  if(mode==='coordinates'){clear();return;}const previous=pointers.get(e.pointerId);if(!previous)return;
  e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){
   const dx=e.clientX-previous.x,dy=e.clientY-previous.y;if(!dx&&!dy)return;
   cameraStyle='free';yaw+=dx*.009;
   const control=$('#pitch');pitch=Math.max(+control.min*Math.PI/180,Math.min(+control.max*Math.PI/180,pitch+dy*.006));
  }else{
   const d=distance();if(!pinch||pinch.distance<1){rebase();return;}
   const control=$('#zoom'),min=+control.min,max=+control.max,step=+control.step;
   const raw=pinch.zoom*d/pinch.distance;
   zoom=Number(Math.min(max,Math.max(min,min+Math.round((raw-min)/step)*step)).toFixed(8));
   // Re-anchor at limits so reversing a pinch responds immediately.
   if(raw<min||raw>max)pinch={distance:d,zoom};
  }
  syncCamera();drawLab();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,finish);
 window.addEventListener('blur',clear);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
 document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',clear));
 return clear;
}
installLabTouchControls($('#labCanvas'));
$('#view').oninput=e=>{cameraStyle='free';yaw=+e.target.value*Math.PI/180;syncCamera();drawLab()};$('#pitch').oninput=e=>{cameraStyle='free';pitch=+e.target.value*Math.PI/180;syncCamera();drawLab()};$('#zoom').oninput=e=>{zoom=+e.target.value;syncCamera();drawLab()};function restorePaperView(resetZoom=false){cameraStyle='paper';yaw=GeometryView.defaultYaw;pitch=GeometryView.defaultPitch;if(resetZoom)zoom=1;syncCamera();drawLab()}$('#paperView').onclick=()=>restorePaperView();$('#resetView').onclick=()=>restorePaperView(true);// Keep direct numeric edits and range controls on the same update path.
for(const eventType of ['input','change'])document.addEventListener(eventType,e=>{const el=e.target;if(el.matches('input[data-range]')){const range=$('#'+el.dataset.range);if(el.value===''||!Number.isFinite(el.valueAsNumber)){if(eventType==='change')el.value=range.value;return;}let value=el.valueAsNumber;const min=+range.min,max=+range.max,step=+range.step;if(eventType==='input'&&(value<min||value>max))return;value=Math.min(max,Math.max(min,value));value=Number((min+Math.round((value-min)/step)*step).toFixed(8));range.value=value;if(eventType==='change')el.value=value;range.dispatchEvent(new Event('input',{bubbles:true}));}else if(el.matches('input[type="range"]')){const num=$('#'+el.id+'Number');if(num&&document.activeElement!==num)num.value=el.value;}});
renderControls();syncCamera();typeset(document.body);new ResizeObserver(()=>{drawHero();drawLab()}).observe(document.body);

function openSectionFromHash(){if(location.hash==='#section'&&mode!=='section')document.querySelector('[data-mode="section"]').click();}window.addEventListener('hashchange',openSectionFromHash);openSectionFromHash();
