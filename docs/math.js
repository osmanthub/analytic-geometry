'use strict';
const mathOptions={throwOnError:true,strict:'ignore',trust:false,macros:{'\\V':'\\boldsymbol{#1}','\\Prj':'\\operatorname{Prj}'}};
const mathCache=new Map();
function mathHTML(tex,display=false){const key=(display?'D':'I')+tex;if(!mathCache.has(key))mathCache.set(key,katex.renderToString(tex,{...mathOptions,displayMode:display}));return mathCache.get(key);}
function typeset(root=document.body){renderMathInElement(root,{...mathOptions,delimiters:[{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}],ignoredClasses:['katex','plot-label']});}
