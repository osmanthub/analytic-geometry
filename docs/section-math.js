'use strict';
// Plane coordinates are orthonormal: X = d n + u e1 + v e2.
// Classification is algebraic; tracing samples exact roots of the restricted quadratic.
const SectionMath=(()=>{
 const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0), rad=x=>x*Math.PI/180;
 const labels={circle:'圆',ellipse:'椭圆',parabola:'抛物线',hyperbola:'双曲线',point:'一个点','intersecting-lines':'两条相交直线','parallel-lines':'两条平行直线',line:'一条直线',empty:'无实交线',plane:'整个截平面'};
 function roots(a,b,c,tol=1e-13){
  const scale=Math.max(Math.abs(a),Math.abs(b),Math.abs(c),1e-30);
  if(Math.abs(a)<=tol*scale){return Math.abs(b)<=tol*scale?[]:[-c/b];}
  let disc=b*b-4*a*c, eps=tol*(b*b+Math.abs(4*a*c)+1e-30);
  if(disc < -eps)return[];if(Math.abs(disc)<=eps)return[-b/(2*a)];
  const q=-.5*(b+(b>=0?1:-1)*Math.sqrt(disc));return[q/a,c/q].sort((x,y)=>x-y);
 }
 function compute({surface='cone',a=1,b=1,c=1,beta=0,phi=0,d=1}={}){
  if(![a,b,c].every(x=>Number.isFinite(x)&&x>0)||![beta,phi,d].every(Number.isFinite))throw Error('Invalid section parameters');
  const be=rad(beta),ph=rad(phi),n=[Math.sin(be)*Math.cos(ph),Math.sin(be)*Math.sin(ph),Math.cos(be)],e1=[Math.cos(be)*Math.cos(ph),Math.cos(be)*Math.sin(ph),-Math.sin(be)],e2=[-Math.sin(ph),Math.cos(ph),0],p=n.map(x=>d*x);
  let q,l=[0,0,0],f;
  switch(surface){
   case 'cone':q=[1/a**2,1/b**2,-1/c**2];f=0;break;
   case 'ellipsoid':q=[1/a**2,1/b**2,1/c**2];f=-1;break;
   case 'hyperboloid':q=[1/a**2,1/b**2,-1/c**2];f=-1;break;
   case 'double':q=[-1/a**2,-1/b**2,1/c**2];f=-1;break;
   case 'cylinder':q=[1/a**2,1/b**2,0];f=-1;break;
   case 'paraboloid':q=[1/a**2,1/b**2,0];l=[0,0,-1];f=0;break;
   case 'saddle':q=[1/a**2,-1/b**2,0];l=[0,0,-1];f=0;break;
   default:throw Error('Unknown section surface '+surface);
  }
  const bil=(x,y)=>x.reduce((s,v,i)=>s+v*q[i]*y[i],0),quadric=x=>bil(x,x)+2*dot(l,x)+f;
  const A=bil(e1,e1),B=bil(e1,e2),C=bil(e2,e2),D=bil(e1,p)+dot(e1,l),E=bil(e2,p)+dot(e2,l),F=quadric(p),coefficients=[A,B,C,D,E,F];
  let angle=.5*Math.atan2(2*B,A-C),co=Math.cos(angle),si=Math.sin(angle);
  let lam=A*co*co+2*B*co*si+C*si*si,mu=A*si*si-2*B*co*si+C*co*co;
  if(Math.abs(mu)>Math.abs(lam)){angle+=Math.PI/2;co=Math.cos(angle);si=Math.sin(angle);[lam,mu]=[mu,lam];}
  // Recover the small eigenvalue from the determinant, avoiding subtraction of two large eigenvalues.
  if(lam!==0)mu=(A*C-B*B)/lam;
  const L=D*co+E*si,M=-D*si+E*co,scale=Math.max(...q.map(Math.abs),1),tol=1e-12*scale,fromCanonical=([s,t])=>[co*s-si*t,si*s+co*t];
  let type,center=null;
  if(Math.abs(lam)<=tol){
   type=Math.hypot(D,E)>tol?'line':Math.abs(F)>tol?'empty':'plane';
  }else if(Math.abs(mu)<=tol){
   if(Math.abs(M)>tol)type='parabola';
   else{const h=-L/lam,fc=F-L*L/lam,eps=1e-12*Math.max(1,Math.abs(F),Math.abs(L*L/lam));
    type=Math.abs(fc)<=eps?'line':-fc/lam>0?'parallel-lines':'empty';center=fromCanonical([h,0]);}
  }else{
   const h=-L/lam,k=-M/mu,g=F-L*L/lam-M*M/mu,eps=1e-12*Math.max(1,Math.abs(F),Math.abs(L*L/lam),Math.abs(M*M/mu));center=fromCanonical([h,k]);
   if(lam*mu<0)type=Math.abs(g)<=eps?'intersecting-lines':'hyperbola';
   else if(Math.abs(g)<=eps)type='point';
   else if(-g/lam<0)type='empty';
   else type=Math.abs(lam-mu)<=tol?'circle':'ellipse';
  }
  const map=([u,v])=>p.map((x,i)=>x+u*e1[i]+v*e2[i]);
  return{n,e1,e2,p,coefficients,type,label:labels[type],map,quadric,center,tolerance:tol,nearCritical:Math.abs(mu)<=1e-8*scale,canonical:{lam,mu,L,M,F,co,si},fromCanonical};
 }
 function trace(r,extent=5){
  if(!(extent>0&&Number.isFinite(extent)))throw Error('Invalid extent');
  const inside=p=>p.every(x=>Number.isFinite(x)&&Math.abs(x)<=extent+1e-9);
  if(r.type==='empty'||r.type==='plane')return[];
  if(r.type==='point')return inside(r.center)?[[r.center]]:[];
  const [A,B,C,D,E,F]=r.coefficients,{lam,mu,L,M,co,si}=r.canonical;
  const bound=extent*(Math.abs(co)+Math.abs(si)),events=[-bound,bound];
  // Include all exact window-boundary intersections and all turning points.
  for(const edge of [-extent,extent]){
   for(const v of roots(C,2*(B*edge+E),A*edge*edge+2*D*edge+F))if(Math.abs(v)<=extent+1e-8)events.push(-si*edge+co*v);
   for(const u of roots(A,2*(B*edge+D),C*edge*edge+2*E*edge+F))if(Math.abs(u)<=extent+1e-8)events.push(-si*u+co*edge);
  }
  if(Math.abs(lam)<=r.tolerance){
   // Entire quadratic part is numerically zero: intersect the straight line with the window.
   const pts=[];for(const x of [-extent,extent]){
    if(Math.abs(E)>r.tolerance){const p=[x,-(2*D*x+F)/(2*E)];if(inside(p))pts.push(p);}
    if(Math.abs(D)>r.tolerance){const p=[-(2*E*x+F)/(2*D),x];if(inside(p))pts.push(p);}
   }return pts.length>=2?[[pts[0],pts.find(p=>Math.hypot(p[0]-pts[0][0],p[1]-pts[0][1])>1e-9)||pts[0]]]:[];
  }
  events.push(...roots(-lam*mu,-2*lam*M,L*L-lam*F));
  const ts=events.filter(x=>x>=-bound-1e-8&&x<=bound+1e-8).sort((a,b)=>a-b).filter((x,i,ar)=>i===0||Math.abs(x-ar[i-1])>1e-10);
  const paths=[];
  const at=(t,branch)=>{
   const rr=roots(lam,2*L,mu*t*t+2*M*t+F);if(!rr.length)return null;
   return r.fromCanonical([rr[Math.min(branch,rr.length-1)],t]);
  };
  for(let j=0;j<ts.length-1;j++)for(let branch=0;branch<2;branch++){
   const lo=ts[j],hi=ts[j+1],mid=at((lo+hi)/2,branch);if(!mid||!inside(mid))continue;
   let run=[];
   for(let i=0;i<=240;i++){
    // Cosine spacing resolves vertical tangencies at interval endpoints.
    const t=lo+(hi-lo)*(1-Math.cos(Math.PI*i/240))/2,p=at(t,branch);
    if(p&&inside(p)){run.push(p);}else if(run.length){paths.push(run);run=[];}
   }if(run.length)paths.push(run);
  }
  // Retain tangencies that touch only a window corner.
  if(!paths.length)for(const t of ts){const p=at(t,0);if(p&&inside(p))paths.push([p]);}
  return paths;
 }
 function coneCriticalBeta(a,b,c,phi=0){return Math.atan2(c,Math.hypot(a*Math.cos(rad(phi)),b*Math.sin(rad(phi))))*180/Math.PI;}
 return{compute,trace,coneCriticalBeta};
})();
if(typeof module!=='undefined')module.exports=SectionMath;
