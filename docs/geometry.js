'use strict';
// Pure geometry shared by the canvas experiments and numerical checks.
const Geometry={
  patches(type,a,b,c){
    const turn=2*Math.PI;
    const patch=(at,u=[0,turn],v=[-2.4,2.4])=>({at,u,v});
    switch(type){
      case 'ellipsoid':return[patch((u,v)=>[a*Math.cos(u)*Math.cos(v),b*Math.sin(u)*Math.cos(v),c*Math.sin(v)],[0,turn],[-Math.PI/2,Math.PI/2])];
      case 'hyperboloid':return[patch((u,z)=>[a*Math.sqrt(1+z*z/c**2)*Math.cos(u),b*Math.sqrt(1+z*z/c**2)*Math.sin(u),z])];
      case 'double':return[-1,1].map(sign=>patch((u,t)=>[a*Math.sinh(t)*Math.cos(u),b*Math.sinh(t)*Math.sin(u),sign*c*Math.cosh(t)],[0,turn],[0,1]));
      case 'paraboloid':return[patch((u,t)=>[a*t*Math.cos(u),b*t*Math.sin(u),t*t/2],[0,turn],[0,2])];
      case 'saddle':return[patch((u,v)=>[u,v,(u*u/a**2-v*v/b**2)/2],[-2.2,2.2],[-2.2,2.2])];
      case 'cylinder':return[patch((u,z)=>[a*Math.cos(u),b*Math.sin(u),z])];
      case 'circularCylinder':return this.patches('cylinder',a,a,c);
      case 'obliqueCylinder':return[patch((u,z)=>[a*Math.cos(u)-z,b*Math.sin(u),z])];
      case 'parabolicCylinder':return[patch((u,z)=>[u,u*u/(2*a),z],[-2.4,2.4])];
      case 'cone':return[patch((u,t)=>[a*t*Math.cos(u),b*t*Math.sin(u),c*t],[0,turn],[-1.3,1.3])];
      case 'circularCone':return this.patches('cone',a,a,c);
      default:throw Error('Unknown surface: '+type);
    }
  },
  rotate(p,n,angle){const d=p.reduce((sum,x,i)=>sum+x*n[i],0),co=Math.cos(angle),si=Math.sin(angle);const cross=[n[1]*p[2]-n[2]*p[1],n[2]*p[0]-n[0]*p[2],n[0]*p[1]-n[1]*p[0]];return p.map((x,i)=>x*co+cross[i]*si+n[i]*d*(1-co));},
  frame(axis){if(axis==='x')return{n:[1,0,0],e:[0,1,0]};if(axis==='y')return{n:[0,1,0],e:[0,0,1]};if(axis==='diag')return{n:[1,1,1].map(x=>x/Math.sqrt(3)),e:[1/Math.sqrt(2),-1/Math.sqrt(2),0]};return{n:[0,0,1],e:[1,0,0]};},
  profile(kind,a,c,q){
    if(kind==='skew')return[{range:[-1,1],global:t=>[2*t,t,1]}];
    const make=(at,range=[-2.4,2.4])=>({at,range});
    switch(kind){
      case 'wave':return[make(t=>[a+q*Math.cos(2*t),t])];
      case 'torus':return[make(t=>[a+q*Math.cos(t),q*Math.sin(t)],[0,2*Math.PI])];
      case 'sphere':return[make(t=>[a*Math.cos(t),a*Math.sin(t)],[-Math.PI/2,Math.PI/2])];
      case 'spheroid':return[make(t=>[a*Math.cos(t),c*Math.sin(t)],[-Math.PI/2,Math.PI/2])];
      case 'cylinder':return[make(t=>[a,t])];
      case 'cone':return[make(t=>[a*t,c*t],[-1.3,1.3])];
      case 'paraboloid':return[make(t=>[t,t*t/(2*a)],[0,3])];
      case 'hyperboloid':return[make(t=>[a*Math.sqrt(1+t*t/c**2),t])];
      case 'double':return[-1,1].map(sign=>make(t=>[a*Math.sinh(t),sign*c*Math.cosh(t)],[0,1]));
      default:throw Error('Unknown profile: '+kind);
    }
  },
  mother(profile,t,axis){if(profile.global)return profile.global(t);const [r,z]=profile.at(t),{n,e}=this.frame(axis);return n.map((x,i)=>z*x+r*e[i]);},
  revolution(kind,axis,a,c,q,sweep=2*Math.PI){const n=this.frame(axis).n;return this.profile(kind,a,c,q).map(profile=>({u:[0,sweep],v:profile.range,at:(u,t)=>this.rotate(this.mother(profile,t,axis),n,u)}));},
  toNew([x,y],h,k,alpha){const co=Math.cos(alpha),si=Math.sin(alpha);return[(x-h)*co+(y-k)*si,-(x-h)*si+(y-k)*co];},
  toOld([x,y],h,k,alpha){return[h+x*Math.cos(alpha)-y*Math.sin(alpha),k+x*Math.sin(alpha)+y*Math.cos(alpha)];}
};
if(typeof module!=='undefined')module.exports=Geometry;
