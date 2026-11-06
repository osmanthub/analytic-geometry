'use strict';
// A screen frame is ordered (right, up, toward the observer). Canvas y is down.
// In every mode right × up points toward the observer; no reflected 3D frame.
const GeometryView={
  defaultYaw:35*Math.PI/180,
  defaultPitch:22*Math.PI/180,
  frame(angle,tilt,kind='free'){
    let right,up;
    if(kind==='flat'){
      // The separate 2D coordinate experiment maps (x,y) to world (x,0,y).
      right=[1,0,0];up=[0,0,1];
    }else if(kind==='paper'){
      const a=this.defaultYaw,t=this.defaultPitch;
      // A shear of the right-handed orthographic view preserves its viewing
      // rays, while +y is horizontal and +z vertical on the sheet.
      right=[-Math.cos(a),Math.sin(a),0];
      up=[-Math.sin(t)/Math.sin(a),0,Math.cos(t)];
    }else{
      right=[-Math.cos(angle),Math.sin(angle),0];
      up=[-Math.sin(angle)*Math.sin(tilt),-Math.cos(angle)*Math.sin(tilt),Math.cos(tilt)];
    }
    const cross=[right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0]];
    const length=Math.hypot(...cross),toward=cross.map(x=>x/length);
    return {right,up,toward,project:p=>[p.reduce((s,x,i)=>s+x*right[i],0),-p.reduce((s,x,i)=>s+x*up[i],0)]};
  }
};
if(typeof module!=='undefined')module.exports=GeometryView;
