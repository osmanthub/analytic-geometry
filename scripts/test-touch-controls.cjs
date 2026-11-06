// Exercise the actual pointer handler, without loading unrelated drawing code.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('node:path').join(__dirname,'../docs/app.js'),'utf8');
const code=src.slice(src.indexOf('function installLabTouchControls('),src.indexOf("installLabTouchControls($('#labCanvas'))"));
function target(){const listeners={},captures=new Set();return{
 addEventListener(t,f){(listeners[t]??=[]).push(f)},
 emit(t,props={}){for(const f of listeners[t]||[])f({preventDefault(){},pointerType:'touch',button:0,...props})},
 setPointerCapture(id){captures.add(id)},hasPointerCapture(id){return captures.has(id)},
 releasePointerCapture(id){captures.delete(id)},captures
}}
const canvas=target(),win=target(),doc=target(),modeButton=target();
doc.querySelectorAll=()=>[modeButton];doc.hidden=false;
let blurred=false;doc.activeElement={matches:()=>true,blur(){blurred=true;doc.activeElement=null}};
const controls={pitch:{min:'-70',max:'70'},zoom:{min:'.6',max:'1.8',step:'.05'}};
const context={window:win,document:doc,mode:'surface',yaw:0,pitch:0,zoom:1,cameraStyle:'paper',syncs:0,draws:0,
 $:s=>controls[s.slice(1)],syncCamera(){context.syncs++},drawLab(){context.draws++}};
vm.createContext(context);vm.runInContext(code,context);context.installLabTouchControls(canvas);
const event=(type,id,x,y=0)=>canvas.emit(type,{pointerId:id,clientX:x,clientY:y});
event('pointerdown',1,0);event('pointermove',1,10,10);
assert.equal(blurred,true);assert.equal(context.yaw,.09);assert.equal(context.pitch,.06);assert.equal(context.cameraStyle,'free');
event('pointerdown',2,110,10);const yaw=context.yaw;
event('pointermove',2,160,10);assert.equal(context.zoom,1.5);assert.equal(context.yaw,yaw);
event('pointermove',2,500,10);assert.equal(context.zoom,1.8);
event('pointermove',2,1,10);assert.equal(context.zoom,.6);
event('pointerup',2,1,10);event('pointermove',1,10,10);assert.equal(context.yaw,yaw);
event('pointermove',1,20,10);assert.equal(context.yaw,.18);
event('pointercancel',1,20,10);event('pointermove',1,1000,1000);assert.equal(context.yaw,.18);
event('pointerdown',3,30);event('lostpointercapture',3,30);event('pointermove',3,500);assert.equal(context.yaw,.18);
event('pointerdown',4,40);win.emit('blur');event('pointermove',4,500);assert.equal(context.yaw,.18);
event('pointerdown',5,50);modeButton.emit('click');event('pointermove',5,500);assert.equal(context.yaw,.18);
context.mode='coordinates';event('pointerdown',6,60);event('pointermove',6,800);assert.equal(context.yaw,.18);assert.equal(canvas.captures.size,0);
context.mode='surface';event('pointerdown',7,70);event('pointermove',7,70,10000);assert.equal(context.pitch,70*Math.PI/180);
event('pointerdown',8,170);event('pointerdown',9,500);assert.equal(canvas.captures.has(9),false);
const before=context.zoom;event('pointermove',9,1000);assert.equal(context.zoom,before);
doc.hidden=true;doc.emit('visibilitychange');assert.equal(canvas.captures.size,0);
assert.equal(context.syncs,context.draws);assert.equal(context.syncs,6);
console.log('PASS: single drag, pinch bounds, pointer transitions/cancel/lost capture, background reset, coordinate mode, pitch bounds, third pointer ignored');
